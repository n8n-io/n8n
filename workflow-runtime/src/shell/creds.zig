//! The credentials file (spec section 7): read once at start, then only
//! read. Values from it must never reach a log line or an error message;
//! messages name the slot and the path only.
const std = @import("std");
const http = @import("http.zig");

pub const Store = struct {
    root: std.json.Value,
    /// The document as parsed. It must live as long as the store.
    text: []const u8 = "",
    /// A workflow's own store falls back to the global store (spec 9.1).
    next: ?*const Store = null,

    /// Parse the file. The memory stays for the life of the process.
    pub fn parse(gpa: std.mem.Allocator, text: []const u8) !Store {
        const root = try std.json.parseFromSliceLeaky(std.json.Value, gpa, text, .{ .parse_numbers = false });
        if (root != .object) return error.CredentialsNotAnObject;
        return .{ .root = root, .text = text };
    }

    /// A slot as raw JSON of the document, for frames to the fallback host:
    /// `type` (a JSON string, or `null`) and `data` (the entry's `data`, or
    /// the whole entry in the old form). It copies and allocates nothing.
    pub fn rawSlot(s: *const Store, name: []const u8) ?RawSlot {
        var cur: ?*const Store = s;
        var depth: u32 = 0;
        while (cur) |c| : (cur = c.next) {
            // A workflow store has one global store behind it.
            depth += 1;
            std.debug.assert(depth <= max_chain);
            const e = rawMember(c.text, name) orelse continue;
            const is_obj = e.len > 0 and e[0] == '{';
            const data = if (is_obj) rawMember(e, "data") orelse e else e;
            const ty = if (is_obj) rawMember(e, "type") else null;
            const type_json = if (ty) |t| (if (t.len > 0 and t[0] == '"') t else "null") else "null";
            return .{ .type_json = type_json, .data_json = data };
        }
        return null;
    }

    /// The raw entry of a slot, own store first, then `next`.
    pub fn entry(s: *const Store, name: []const u8) ?std.json.Value {
        var cur: ?*const Store = s;
        while (cur) |c| : (cur = c.next) {
            if (c.root.object.get(name)) |v| return v;
        }
        return null;
    }

    pub fn slot(s: *const Store, name: []const u8) ?Slot {
        const v = s.entry(name) orelse return null;
        if (v != .object) return null;
        const data = v.object.get("data") orelse v;
        var out: Slot = .{ .name = name, .data = data };
        if (v.object.get("inject")) |inj| if (inj == .object) {
            if (inj.object.get("headers")) |h| if (h == .object) {
                out.headers = h.object;
            };
            if (inj.object.get("qs")) |q| if (q == .object) {
                out.qs = q.object;
            };
            if (inj.object.get("body")) |q| if (q == .object and q.object.count() > 0) {
                out.body = q.object;
            };
            if (inj.object.get("basicAuth")) |b| if (b == .object) {
                out.basic_user = str(b.object.get("user"));
                out.basic_password = str(b.object.get("password"));
                out.basic = true;
            };
        };
        return out;
    }

    fn str(v: ?std.json.Value) []const u8 {
        const x = v orelse return "";
        return if (x == .string) x.string else "";
    }
};

/// Credential documents that arrive after startup (the admin API), each in
/// a slot of `slot_bytes` reserved at startup. Requests copy what they need
/// from a store when they start, so a replaced store frees its slot at once.
pub const Pool = struct {
    gpa: std.mem.Allocator,
    mem: []u8,
    slot_bytes: usize,
    stores: []Store,
    free: []u32,
    nfree: u32,

    pub fn init(gpa: std.mem.Allocator, nslots: u32, slot_bytes: usize) !Pool {
        std.debug.assert(nslots > 0 and slot_bytes >= 4096);
        const free = try gpa.alloc(u32, nslots);
        for (free, 0..) |*f, i| f.* = @intCast(nslots - 1 - i);
        return .{
            .gpa = gpa,
            .mem = try @import("core").arena.reserve(gpa, u8, slot_bytes * nslots),
            .slot_bytes = slot_bytes,
            .stores = try gpa.alloc(Store, nslots),
            .free = free,
            .nfree = nslots,
        };
    }

    pub fn deinit(p: *Pool) void {
        p.gpa.free(p.mem);
        p.gpa.free(p.stores);
        p.gpa.free(p.free);
    }

    pub const Error = error{ PoolFull, TooLarge, CredentialsNotAnObject };

    /// Copy `text` into a free slot and parse it there.
    pub fn parse(p: *Pool, text: []const u8) Error!*Store {
        if (p.nfree == 0) return error.PoolFull;
        const i = p.free[p.nfree - 1];
        const slot = p.mem[@as(usize, i) * p.slot_bytes ..][0..p.slot_bytes];
        var fba = std.heap.FixedBufferAllocator.init(slot);
        const a = fba.allocator();
        const copy = a.dupe(u8, text) catch return error.TooLarge;
        p.stores[i] = Store.parse(a, copy) catch |e| switch (e) {
            error.CredentialsNotAnObject => return error.CredentialsNotAnObject,
            error.OutOfMemory => return error.TooLarge,
            else => return error.CredentialsNotAnObject,
        };
        p.nfree -= 1;
        std.debug.assert(fba.end_index <= slot.len);
        return &p.stores[i];
    }

    /// Give back the slot of `s`. A store from elsewhere (the
    /// `--credentials` file) is left alone.
    pub fn release(p: *Pool, s: *const Store) void {
        const base = @intFromPtr(p.stores.ptr);
        const at = @intFromPtr(s);
        if (at < base or at >= base + p.stores.len * @sizeOf(Store)) return;
        const i: u32 = @intCast((at - base) / @sizeOf(Store));
        for (p.free[0..p.nfree]) |f| std.debug.assert(f != i); // A double release.
        const slot = p.mem[@as(usize, i) * p.slot_bytes ..][0..p.slot_bytes];
        @import("sys.zig").poison(slot);
        @import("sys.zig").releasePages(slot);
        p.free[p.nfree] = i;
        p.nfree += 1;
    }
};

pub const Slot = struct {
    name: []const u8,
    data: std.json.Value,
    headers: ?std.json.ObjectMap = null,
    qs: ?std.json.ObjectMap = null,
    /// Members added to a JSON object body.
    body: ?std.json.ObjectMap = null,
    basic: bool = false,
    basic_user: []const u8 = "",
    basic_password: []const u8 = "",
};

/// A bounded output buffer. With `buf` empty it only counts, which gives
/// the length of an output before it is written.
pub const Out = struct {
    buf: []u8,
    len: usize = 0,
    count_only: bool = false,

    pub const Error = error{NoSpace};

    pub fn counter() Out {
        return .{ .buf = &.{}, .count_only = true };
    }

    pub fn put(o: *Out, bytes: []const u8) Error!void {
        if (!o.count_only) {
            if (o.len + bytes.len > o.buf.len) return error.NoSpace;
            @memcpy(o.buf[o.len..][0..bytes.len], bytes);
        }
        o.len += bytes.len;
    }

    pub fn byte(o: *Out, c: u8) Error!void {
        if (!o.count_only) {
            if (o.len + 1 > o.buf.len) return error.NoSpace;
            o.buf[o.len] = c;
        }
        o.len += 1;
    }

    pub fn written(o: *const Out) []u8 {
        std.debug.assert(!o.count_only);
        return o.buf[0..o.len];
    }
};

pub const TemplateError = error{ NoSpace, MissingValue };

/// How substituted values are written.
pub const Escape = enum { none, json_string };

const open_tag = "{{$credentials.";

/// Copy `tpl` to `out`, replacing each `{{$credentials.<path>}}` with the
/// string value of `data.<path>`. On `MissingValue`, `missing` holds the
/// path that has no value. Text that is not a complete template is copied
/// as it is.
pub fn substitute(tpl: []const u8, data: std.json.Value, esc: Escape, out: *Out, missing: *[]const u8) TemplateError!void {
    std.debug.assert(out.count_only or out.len <= out.buf.len);
    var i: usize = 0;
    while (i < tpl.len) {
        const at = std.mem.indexOfPos(u8, tpl, i, open_tag) orelse {
            try out.put(tpl[i..]);
            return;
        };
        const close = std.mem.indexOfPos(u8, tpl, at + open_tag.len, "}}") orelse {
            try out.put(tpl[i..]);
            return;
        };
        try out.put(tpl[i..at]);
        const path = std.mem.trim(u8, tpl[at + open_tag.len .. close], " ");
        var numbuf: [8]u8 = undefined;
        const text = valueText(data, path, &numbuf) orelse {
            missing.* = path;
            return error.MissingValue;
        };
        switch (esc) {
            .none => try out.put(text),
            .json_string => try writeJsonStringBody(out, text),
        }
        i = close + 2;
    }
}

/// True if `s` holds a template, so callers can skip the copy.
pub fn hasTemplate(s: []const u8) bool {
    return std.mem.indexOf(u8, s, open_tag) != null;
}

/// The text of the value at a dotted path: a string as it is, a number as
/// its JSON text, a boolean as true or false. Null if there is no value.
fn valueText(data: std.json.Value, path: []const u8, numbuf: *[8]u8) ?[]const u8 {
    var v = data;
    var it = std.mem.splitScalar(u8, path, '.');
    var depth: u32 = 0;
    while (it.next()) |part| : (depth += 1) {
        if (depth >= 32 or part.len == 0) return null;
        v = switch (v) {
            .object => |o| o.get(part) orelse return null,
            .array => |a| blk: {
                const idx = std.fmt.parseInt(usize, part, 10) catch return null;
                if (idx >= a.items.len) return null;
                break :blk a.items[idx];
            },
            else => return null,
        };
    }
    return switch (v) {
        .string => |s| s,
        .number_string => |s| s,
        .bool => |b| if (b) "true" else "false",
        .integer => |n| std.fmt.bufPrint(numbuf, "{d}", .{n}) catch null,
        else => null,
    };
}

/// The inside of a JSON string literal for `s` (no quotes).
pub fn writeJsonStringBody(out: *Out, s: []const u8) Out.Error!void {
    var start: usize = 0;
    for (s, 0..) |c, i| {
        const rep: ?[]const u8 = switch (c) {
            '"' => "\\\"",
            '\\' => "\\\\",
            '\n' => "\\n",
            '\r' => "\\r",
            '\t' => "\\t",
            0x08 => "\\b",
            0x0c => "\\f",
            else => null,
        };
        if (rep == null and c >= 0x20) continue;
        try out.put(s[start..i]);
        if (rep) |r| {
            try out.put(r);
        } else {
            var hex: [6]u8 = undefined;
            _ = std.fmt.bufPrint(&hex, "\\u{x:0>4}", .{c}) catch unreachable;
            try out.put(&hex);
        }
        start = i + 1;
    }
    try out.put(s[start..]);
}

pub const RawSlot = struct { type_json: []const u8, data_json: []const u8 };

/// Stores in one lookup chain: a workflow store, then the global store.
const max_chain = 4;

/// The raw value of member `name` of a raw JSON object. The key compares
/// as raw text; slot names have no escapes.
fn rawMember(obj: []const u8, name: []const u8) ?[]const u8 {
    var it = http.Members.init(obj) orelse return null;
    // Each step moves past one member, so the text length bounds the loop.
    var left = obj.len;
    while (it.next()) |m| {
        std.debug.assert(left > 0);
        left -= 1;
        if (m.key.len == name.len + 2 and std.mem.eql(u8, m.key[1 .. m.key.len - 1], name)) return m.value;
    }
    return null;
}

test "rawSlot gives the raw type and data of a slot, own store first" {
    var arena = std.heap.ArenaAllocator.init(std.testing.allocator);
    defer arena.deinit();
    const a = arena.allocator();
    const global = try Store.parse(a, "{\"api\":{\"type\":\"g\",\"data\":{\"t\":\"global\"}},\r\n\t\"old\":{\"token\":\"x\"}}");
    var wf = try Store.parse(a, "{ \"api\": {\"type\":\"w\",\"data\":{\"t\":[1,{\"d\":2}]}} }");
    wf.next = &global;
    const own = wf.rawSlot("api").?;
    try std.testing.expectEqualStrings("\"w\"", own.type_json);
    try std.testing.expectEqualStrings("{\"t\":[1,{\"d\":2}]}", own.data_json);
    const old = wf.rawSlot("old").?;
    try std.testing.expectEqualStrings("null", old.type_json);
    try std.testing.expectEqualStrings("{\"token\":\"x\"}", old.data_json);
    try std.testing.expect(wf.rawSlot("none") == null);
}

test "credential pool reuses slots" {
    var p = try Pool.init(std.testing.allocator, 2, 8192);
    defer p.deinit();
    const a = try p.parse("{\"x\":{\"data\":{\"t\":\"1\"}}}");
    const b = try p.parse("{\"y\":1}");
    try std.testing.expectError(error.PoolFull, p.parse("{}"));
    try std.testing.expect(a.entry("x") != null);
    p.release(a);
    // The freed slot holds the next store; the other is untouched.
    const c = try p.parse("{\"z\":2}");
    try std.testing.expect(c == a);
    try std.testing.expect(b.entry("y") != null and c.entry("z") != null);
    try std.testing.expectError(error.CredentialsNotAnObject, blk: {
        p.release(c);
        break :blk p.parse("[1]");
    });
    var big: [9000]u8 = undefined;
    @memset(&big, ' ');
    big[0] = '{';
    big[big.len - 1] = '}';
    try std.testing.expectError(error.TooLarge, p.parse(&big));
    // A store from outside the pool is ignored.
    var outside: Store = b.*;
    p.release(&outside);
    try std.testing.expectEqual(@as(u32, 1), p.nfree);
}

test "credential templates" {
    const gpa = std.testing.allocator;
    var arena = std.heap.ArenaAllocator.init(gpa);
    defer arena.deinit();
    const store = try Store.parse(arena.allocator(),
        \\{"api":{"type":"x","data":{"token":"s3cr\"t","n":42,"deep":{"a":"b"}},
        \\ "inject":{"headers":{"Authorization":"Bearer {{$credentials.token}}"},"basicAuth":{"user":"u","password":"{{$credentials.n}}"}}},
        \\ "old":{"accessToken":"t0"}}
    );
    const s = store.slot("api").?;
    try std.testing.expect(s.basic);
    try std.testing.expect(s.headers != null);
    var buf: [128]u8 = undefined;
    var out: Out = .{ .buf = &buf };
    var missing: []const u8 = "";
    try substitute("Bearer {{$credentials.token}} {{$credentials.n}}/{{$credentials.deep.a}}", s.data, .none, &out, &missing);
    try std.testing.expectEqualStrings("Bearer s3cr\"t 42/b", out.written());
    out = .{ .buf = &buf };
    try substitute("{{$credentials.token}}", s.data, .json_string, &out, &missing);
    try std.testing.expectEqualStrings("s3cr\\\"t", out.written());
    out = .{ .buf = &buf };
    try std.testing.expectError(error.MissingValue, substitute("x{{$credentials.nope}}", s.data, .none, &out, &missing));
    try std.testing.expectEqualStrings("nope", missing);
    out = .{ .buf = &buf };
    try substitute("no {{$credentials.token", s.data, .none, &out, &missing);
    try std.testing.expectEqualStrings("no {{$credentials.token", out.written());
    // The old form: the slot object is the data.
    const old = store.slot("old").?;
    out = .{ .buf = &buf };
    try substitute("{{$credentials.accessToken}}", old.data, .none, &out, &missing);
    try std.testing.expectEqualStrings("t0", out.written());
    var cnt = Out.counter();
    try substitute("ab{{$credentials.n}}", s.data, .none, &cnt, &missing);
    try std.testing.expectEqual(@as(usize, 4), cnt.len);
}

test "a workflow store falls back to the global store" {
    var arena = std.heap.ArenaAllocator.init(std.testing.allocator);
    defer arena.deinit();
    const a = arena.allocator();
    const global = try Store.parse(a, "{\"api\":{\"type\":\"g\",\"data\":{\"t\":\"global\"}},\"other\":{\"type\":\"o\",\"data\":{}}}");
    var wf = try Store.parse(a, "{\"api\":{\"type\":\"w\",\"data\":{\"t\":\"mine\"}}}");
    wf.next = &global;
    try std.testing.expectEqualStrings("mine", wf.slot("api").?.data.object.get("t").?.string);
    try std.testing.expectEqualStrings("o", wf.entry("other").?.object.get("type").?.string);
    try std.testing.expect(wf.entry("none") == null);
}
