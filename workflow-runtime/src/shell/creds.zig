//! The credentials file (spec section 7): read once at start, then only
//! read. Values from it must never reach a log line or an error message;
//! messages name the slot and the path only.
const std = @import("std");
const http = @import("http.zig");
const renew = @import("renew.zig");
const domains = @import("domains.zig");
const cred_flags = @import("core").cred_flags;

/// A value is renewed this long before it expires, so that it outlives
/// the request that carries it.
pub const renew_margin_ms: i64 = 60_000;

pub const Store = struct {
    root: std.json.Value,
    /// The document as parsed. It must live as long as the store.
    text: []const u8 = "",
    /// A workflow's own store falls back to the global store (spec 9.1).
    next: ?*const Store = null,
    /// A slot of this document has a `renewal` member (n8n can renew it).
    renewable: bool = false,
    /// The first time at which a value of this document needs a renewal:
    /// the earliest `renewal.expiresAt` less the margin. maxInt when no
    /// slot has an expiry. A request compares the clock with it once.
    renew_at_ms: i64 = std.math.maxInt(i64),
    /// The lowest status that means "the value expired" for a slot of this
    /// document; maxInt when no slot has one. A response with a lower
    /// status needs no look at any slot.
    min_status: u32 = std.math.maxInt(u32),

    /// Parse the file. The memory stays for the life of the process.
    pub fn parse(gpa: std.mem.Allocator, text: []const u8) !Store {
        const root = try std.json.parseFromSliceLeaky(std.json.Value, gpa, text, .{ .parse_numbers = false });
        if (root != .object) return error.CredentialsNotAnObject;
        var s: Store = .{ .root = root, .text = text };
        s.scanRenewals();
        return s;
    }

    /// Set `renewable` and `renew_at_ms` from the `renewal` member of each
    /// slot. It reads the text once, when the document arrives.
    fn scanRenewals(s: *Store) void {
        var it = http.Members.init(s.text) orelse return;
        // Each step moves past one member, so the text length bounds the loop.
        var left = s.text.len;
        while (it.next()) |m| {
            std.debug.assert(left > 0);
            left -= 1;
            const raw = rawMember(m.value, "renewal") orelse continue;
            if (raw.len == 0 or raw[0] != '{') continue;
            s.renewable = true;
            s.min_status = @min(s.min_status, lowestStatus(rawMember(raw, "status")));
            const at = expiryOf(rawMember(raw, "expiresAt")) orelse continue;
            s.renew_at_ms = @min(s.renew_at_ms, at -| renew_margin_ms);
        }
    }

    /// The `renewal` member of a slot (own store first, then `next`): the
    /// status codes that mean "expired" and the expiry. Null when n8n
    /// cannot renew the slot.
    pub fn renewal(s: *const Store, name: []const u8) ?renew.Info {
        const v = s.entry(name) orelse return null;
        if (v != .object) return null;
        const r = v.object.get("renewal") orelse return null;
        if (r != .object) return null;
        var info: renew.Info = .{};
        if (r.object.get("expiresAt")) |e| if (e == .number_string) {
            info.expires_at_ms = expiryOf(e.number_string) orelse info.expires_at_ms;
        };
        if (r.object.get("status")) |st| if (st == .array) {
            for (st.array.items) |code| {
                if (info.nstatus == renew.max_statuses) break;
                if (code != .number_string) continue;
                info.statuses[info.nstatus] = std.fmt.parseInt(u16, code.number_string, 10) catch continue; // not a status: it matches nothing
                info.nstatus += 1;
            }
        };
        if (r.object.get("oauth2")) |on| info.oauth2 = on == .bool and on.bool;
        if (r.object.get("statusDefault")) |on| info.status_default = on == .bool and on.bool;
        return info;
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
            if (inj.object.get("defaultHeaders")) |h| if (h == .object) {
                out.default_headers = h.object;
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
        if (v.object.get("allowedDomains")) |limit| if (limit == .object) {
            out.domains_mode = domains.modeOf(str(limit.object.get("mode")));
            out.domains = str(limit.object.get("domains"));
        };
        return out;
    }

    fn str(v: ?std.json.Value) []const u8 {
        const x = v orelse return "";
        return if (x == .string) x.string else "";
    }
};

/// The lowest number of a `renewal.status` list (raw JSON); maxInt when it
/// has none. A slot whose requests can give their own statuses
/// (`statusDefault`) counts with its list: the options of the nodes of n8n
/// give 401 and above.
fn lowestStatus(raw: ?[]const u8) u32 {
    var it = http.Elements.init(raw orelse return std.math.maxInt(u32)) orelse return std.math.maxInt(u32);
    var low: u32 = std.math.maxInt(u32);
    var n: usize = 0;
    // Only `renew.max_statuses` count for a slot; the lowest of them is enough.
    while (n < renew.max_statuses) : (n += 1) {
        const e = it.next() orelse break;
        // Text that is no status matches no response: it is left out.
        low = @min(low, std.fmt.parseInt(u16, std.mem.trim(u8, e, " \t\r\n"), 10) catch continue);
    }
    return low;
}

/// The credential flags of a credentials document, as the core reads them
/// (`core/cred_flags.zig`): for each slot, the members of `data.n8nDerived`
/// that have a flag name and a boolean value, `{"<slot>":{"<name>":true}}`.
/// A slot without a flag is left out; `{}` when no slot has one. A flag is
/// one bit of a credential that node code may read. No other value of the
/// document goes into the output, and the output goes to no log line.
pub fn flagsDoc(text: []const u8, buf: []u8) Out.Error![]const u8 {
    var out: Out = .{ .buf = buf };
    try out.byte('{');
    var slots = http.Members.init(text) orelse {
        try out.byte('}');
        return out.written();
    };
    // Each step moves past one member, so the text length bounds each loop.
    var left = text.len;
    var nslots: usize = 0;
    while (slots.next()) |slot| {
        std.debug.assert(left > 0);
        left -= 1;
        const data = rawMember(slot.value, "data") orelse continue;
        const derived = rawMember(data, "n8nDerived") orelse continue;
        var flags = http.Members.init(derived) orelse continue;
        var inner = derived.len;
        var nflags: usize = 0;
        while (flags.next()) |flag| {
            std.debug.assert(inner > 0);
            inner -= 1;
            const on = std.mem.eql(u8, flag.value, "true");
            if (!on and !std.mem.eql(u8, flag.value, "false")) continue;
            if (flag.key.len != cred_flags.name_len + 2 or !cred_flags.isName(flag.key[1 .. flag.key.len - 1])) continue;
            if (nflags == 0) {
                if (nslots > 0) try out.byte(',');
                try out.put(slot.key);
                try out.put(":{");
                nslots += 1;
            } else try out.byte(',');
            try out.put(flag.key);
            try out.put(if (on) ":true" else ":false");
            nflags += 1;
        }
        if (nflags > 0) try out.byte('}');
    }
    try out.byte('}');
    return out.written();
}

test "flagsDoc keeps the flags of each slot and no other value" {
    const t = std.testing;
    var buf: [256]u8 = undefined;
    const doc =
        \\{"a":{"type":"x","data":{"token":"secret","n8nDerived":{"f00000001":true,"d00000001":"text","f00000002":false,"f00000003":"true","f0000004":true}}},
        \\ "b":{"data":{"token":"other"}},
        \\ "c":{"data":{"n8nDerived":{"f00000009":false}}},
        \\ "d":"plain"}
    ;
    const got = try flagsDoc(doc, &buf);
    try t.expectEqualStrings("{\"a\":{\"f00000001\":true,\"f00000002\":false},\"c\":{\"f00000009\":false}}", got);
    try t.expect(cred_flags.valid(got));
    try t.expect(std.mem.indexOf(u8, got, "secret") == null);
    try t.expectEqualStrings("{}", try flagsDoc("{\"b\":{\"data\":{}}}", &buf));
    try t.expectEqualStrings("{}", try flagsDoc("[]", &buf));
    var small: [20]u8 = undefined;
    try t.expectError(error.NoSpace, flagsDoc(doc, &small));
}

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
        if (text.len > slot.len) return error.TooLarge;
        @memcpy(slot[0..text.len], text);
        return p.parseAt(i, text.len);
    }

    /// A credentials-only update: the slots of `patch` replace those of
    /// `base` (or are added), and the other slots of `base` stay. The
    /// result is a new store in a free slot; the caller releases the old one.
    pub fn parseMerged(p: *Pool, base: []const u8, patch: []const u8) Error!*Store {
        if (p.nfree == 0) return error.PoolFull;
        const i = p.free[p.nfree - 1];
        const slot = p.mem[@as(usize, i) * p.slot_bytes ..][0..p.slot_bytes];
        var out: Out = .{ .buf = slot };
        mergeSlots(base, patch, &out) catch |e| return switch (e) {
            error.NoSpace => error.TooLarge,
            error.NotAnObject => error.CredentialsNotAnObject,
        };
        return p.parseAt(i, out.len);
    }

    /// Parse the document in the first `len` bytes of free slot `i`; the
    /// tree goes in the rest of the slot.
    fn parseAt(p: *Pool, i: u32, len: usize) Error!*Store {
        std.debug.assert(p.nfree > 0 and p.free[p.nfree - 1] == i);
        const slot = p.mem[@as(usize, i) * p.slot_bytes ..][0..p.slot_bytes];
        std.debug.assert(len <= slot.len);
        var fba = std.heap.FixedBufferAllocator.init(slot[len..]);
        p.stores[i] = Store.parse(fba.allocator(), slot[0..len]) catch |e| switch (e) {
            error.CredentialsNotAnObject => return error.CredentialsNotAnObject,
            error.OutOfMemory => return error.TooLarge,
            else => return error.CredentialsNotAnObject,
        };
        p.nfree -= 1;
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
    /// Headers that the credential sets only when the request has none of
    /// that name (`inject.defaultHeaders`, spec section 7).
    default_headers: ?std.json.ObjectMap = null,
    qs: ?std.json.ObjectMap = null,
    /// Members added to a JSON object body.
    body: ?std.json.ObjectMap = null,
    basic: bool = false,
    basic_user: []const u8 = "",
    basic_password: []const u8 = "",
    /// `allowedDomains.mode` of the entry: the hosts that a request may go to
    /// when its node reads the limit of the credential (`domains.zig`).
    domains_mode: domains.Mode = .all,
    /// `allowedDomains.domains`: the list of the mode `domains`.
    domains: []const u8 = "",
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

/// The time of a raw `expiresAt` value: whole milliseconds since the epoch.
fn expiryOf(raw: ?[]const u8) ?i64 {
    const text = raw orelse return null;
    const at = std.fmt.parseInt(i64, text, 10) catch return null;
    return if (at > 0) at else null;
}

const MergeError = error{ NoSpace, NotAnObject };

/// Write the object that has the members of `patch`, and the members of
/// `base` that `patch` does not name. Both are raw JSON objects.
fn mergeSlots(base: []const u8, patch: []const u8, out: *Out) MergeError!void {
    var kept = http.Members.init(base) orelse return error.NotAnObject;
    var added = http.Members.init(patch) orelse return error.NotAnObject;
    try out.byte('{');
    var first = true;
    // Each step moves past one member, so the text lengths bound the loops.
    var left = base.len;
    while (kept.next()) |m| {
        std.debug.assert(left > 0);
        left -= 1;
        if (m.key.len < 2 or rawMember(patch, m.key[1 .. m.key.len - 1]) != null) continue;
        try mergeMember(out, &first, m);
    }
    left = patch.len;
    while (added.next()) |m| {
        std.debug.assert(left > 0);
        left -= 1;
        try mergeMember(out, &first, m);
    }
    try out.byte('}');
}

fn mergeMember(out: *Out, first: *bool, m: http.Members.Member) Out.Error!void {
    std.debug.assert(m.key.len >= 2);
    if (!first.*) try out.byte(',');
    first.* = false;
    try out.put(m.key);
    try out.byte(':');
    try out.put(m.value);
}

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

test "a store reads the renewal member of its slots" {
    var arena = std.heap.ArenaAllocator.init(std.testing.allocator);
    defer arena.deinit();
    const plain = try Store.parse(arena.allocator(), "{\"api\":{\"data\":{\"t\":\"1\"}}}");
    try std.testing.expect(!plain.renewable);
    try std.testing.expectEqual(@as(i64, std.math.maxInt(i64)), plain.renew_at_ms);
    try std.testing.expect(plain.renewal("api") == null);
    const store = try Store.parse(arena.allocator(),
        \\{"oauth":{"data":{},"renewal":{"status":[401,403]}},
        \\ "sa":{"data":{},"renewal":{"status":[401],"expiresAt":1700000300000}},
        \\ "sa2":{"data":{},"renewal":{"status":[],"expiresAt":1700000200000}},
        \\ "api":{"data":{}}}
    );
    try std.testing.expect(store.renewable);
    try std.testing.expectEqual(@as(i64, 1700000200000 - renew_margin_ms), store.renew_at_ms);
    const oauth = store.renewal("oauth").?;
    try std.testing.expect(oauth.matches(401) and oauth.matches(403) and !oauth.matches(404));
    try std.testing.expectEqual(@as(i64, std.math.maxInt(i64)), oauth.expires_at_ms);
    const sa = store.renewal("sa").?;
    try std.testing.expectEqual(@as(i64, 1700000300000), sa.expires_at_ms);
    try std.testing.expect(!store.renewal("sa2").?.matches(401));
    try std.testing.expect(store.renewal("api") == null and store.renewal("none") == null);
}

test "a credentials-only update replaces the slots it names and keeps the others" {
    var p = try Pool.init(std.testing.allocator, 2, 8192);
    defer p.deinit();
    const old = try p.parse("{\"a\":{\"data\":{\"t\":\"old\"}},\"b\":{\"data\":{\"t\":\"keep\"}}}");
    const new = try p.parseMerged(old.text, "{\"a\":{\"data\":{\"t\":\"new\"},\"renewal\":{\"status\":[401]}},\"c\":{\"data\":{\"t\":\"added\"}}}");
    try std.testing.expectEqualStrings("new", new.slot("a").?.data.object.get("t").?.string);
    try std.testing.expectEqualStrings("keep", new.slot("b").?.data.object.get("t").?.string);
    try std.testing.expectEqualStrings("added", new.slot("c").?.data.object.get("t").?.string);
    try std.testing.expect(new.renewable and new.renewal("a").?.matches(401));
    // The old store is whole until the caller releases it.
    try std.testing.expectEqualStrings("old", old.slot("a").?.data.object.get("t").?.string);
    p.release(old);
    try std.testing.expectError(error.CredentialsNotAnObject, p.parseMerged(new.text, "[1]"));
    var big: [9000]u8 = @splat('x');
    @memcpy(big[0..6], "{\"k\":\"");
    @memcpy(big[big.len - 2 ..], "\"}");
    try std.testing.expectError(error.TooLarge, p.parseMerged(new.text, &big));
    try std.testing.expectEqual(@as(u32, 1), p.nfree);
    const first = try p.parseMerged("{}", "{\"a\":{\"data\":{\"t\":\"1\"}}}");
    try std.testing.expectEqualStrings("1", first.slot("a").?.data.object.get("t").?.string);
    try std.testing.expectError(error.PoolFull, p.parseMerged("{}", "{}"));
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

test "a slot reads inject.defaultHeaders" {
    var arena = std.heap.ArenaAllocator.init(std.testing.allocator);
    defer arena.deinit();
    const store = try Store.parse(arena.allocator(),
        \\{"notion":{"type":"notionApi","data":{"apiKey":"k"},
        \\ "inject":{"headers":{"Authorization":"Bearer {{$credentials.apiKey}} "},
        \\ "defaultHeaders":{"Notion-Version":"2022-02-22"}}},
        \\ "plain":{"data":{}}}
    );
    const s = store.slot("notion").?;
    const dh = s.default_headers.?;
    try std.testing.expectEqual(@as(usize, 1), dh.count());
    try std.testing.expectEqualStrings("2022-02-22", dh.get("Notion-Version").?.string);
    try std.testing.expect(store.slot("plain").?.default_headers == null);
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
