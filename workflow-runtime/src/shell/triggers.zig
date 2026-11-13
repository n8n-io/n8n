//! Events that configure a module from its META triggers: the time zones
//! of its schedule triggers, the module itself, and routes for its webhook
//! triggers. The shell reads TZif files here; the core never touches files.
const std = @import("std");
const core_lib = @import("core");
const core = core_lib.core;
const module = core_lib.module;

pub const ModuleOptions = struct {
    /// The module's index in the core: the order of its load event.
    index: u32,
    /// Add a route for each webhook trigger. The caller turns this off when
    /// `--route` flags name routes for the module.
    meta_routes: bool,
};

/// Append the zone events, the load event and the route events of one
/// module. Payloads are allocated with `gpa` and live as long as the caller
/// keeps them.
pub fn moduleEvents(gpa: std.mem.Allocator, out: *std.ArrayList(core.Event), bytes: []const u8, opts: ModuleOptions) !void {
    try zoneEvents(gpa, out, bytes);
    try out.append(gpa, .{ .kind = .load_module, .payload = bytes });
    if (!opts.meta_routes) return;
    const meta = module.metaOf(bytes) orelse "{}";
    var it = module.triggers(meta);
    while (it.next()) |t| {
        const kind = module.jsonStr(module.jsonGet(t, "kind")) orelse continue;
        if (!std.mem.eql(u8, kind, "webhook")) continue;
        const raw_path = module.jsonStr(module.jsonGet(t, "path")) orelse continue;
        // The SDK default method is POST.
        const method = module.jsonStr(module.jsonGet(t, "method")) orelse "POST";
        if (method.len > 8 or raw_path.len + 1 > core.max_path) return error.BadWebhookTrigger;
        try out.append(gpa, .{ .kind = .add_route, .payload = try routePayload(gpa, opts.index, method, raw_path) });
    }
}

/// A timezone event for each zone of the module's schedule triggers that
/// `out` does not have yet. They go before the module's load event.
pub fn zoneEvents(gpa: std.mem.Allocator, out: *std.ArrayList(core.Event), bytes: []const u8) !void {
    return zoneEventsNew(gpa, out, bytes, null);
}

/// Like `zoneEvents`, but zones that `st` has already are left out, so
/// their files are not read again.
pub fn zoneEventsNew(gpa: std.mem.Allocator, out: *std.ArrayList(core.Event), bytes: []const u8, st: ?*const core.State) !void {
    const meta = module.metaOf(bytes) orelse "{}";
    var it = module.triggers(meta);
    // The zones of schedules, then the zones that code formats dates in (META `zones`).
    var code_zones = module.ArrayIter.init(module.jsonGet(meta, "zones"));
    var in_code = false;
    while (true) {
        const name: []const u8 = blk: {
            if (!in_code) {
                if (it.next()) |t| {
                    const kind = module.jsonStr(module.jsonGet(t, "kind")) orelse continue;
                    if (!std.mem.eql(u8, kind, "schedule")) continue;
                    break :blk module.jsonStr(module.jsonGet(t, "timezone")) orelse "UTC";
                }
                in_code = true;
            }
            const z = code_zones.next() orelse break;
            break :blk module.jsonStr(z) orelse continue;
        };
        if (std.mem.eql(u8, name, "UTC")) continue;
        if (st) |s| {
            if (core.hasZone(s, name)) continue;
            if (core.zonesAreFull(s)) {
                std.debug.print("the zone table is full: time zone {s} is not loaded (raise --max-zones)\n", .{name});
            }
        }
        var seen = false;
        for (out.items) |e| {
            if (e.kind == .timezone and std.mem.startsWith(u8, e.payload, name) and e.payload.len > name.len and e.payload[name.len] == '\n') seen = true;
        }
        if (seen) continue;
        try out.append(gpa, .{ .kind = .timezone, .payload = try zonePayload(gpa, name) });
    }
}

fn routePayload(gpa: std.mem.Allocator, index: u32, method: []const u8, raw_path: []const u8) ![]u8 {
    var spec: core.RouteSpec = .{ .module = index, .rate_per_s = 0, .burst = 0, .concurrency = 0, .method = @splat(0) };
    @memcpy(spec.method[0..method.len], method);
    // n8n webhook paths have no leading slash; the router matches "/path".
    const slash: usize = if (std.mem.startsWith(u8, raw_path, "/")) 0 else 1;
    const buf = try gpa.alloc(u8, @sizeOf(core.RouteSpec) + slash + raw_path.len);
    @memcpy(buf[0..@sizeOf(core.RouteSpec)], std.mem.asBytes(&spec));
    if (slash == 1) buf[@sizeOf(core.RouteSpec)] = '/';
    @memcpy(buf[@sizeOf(core.RouteSpec) + slash ..], raw_path);
    return buf;
}

/// `name\n` then the TZif bytes of `$TZDIR/name` (default
/// `/usr/share/zoneinfo`).
pub fn zonePayload(gpa: std.mem.Allocator, name: []const u8) ![]u8 {
    if (name.len == 0 or name.len > 64 or name[0] == '/' or std.mem.indexOf(u8, name, "..") != null) return error.BadTimezone;
    const dir: []const u8 = if (std.c.getenv("TZDIR")) |d| std.mem.span(d) else "/usr/share/zoneinfo";
    var path_buf: [512]u8 = undefined;
    const path = try std.fmt.bufPrintSentinel(&path_buf, "{s}/{s}", .{ dir, name }, 0);
    const fd = std.c.open(path, .{ .ACCMODE = .RDONLY }, @as(std.c.mode_t, 0));
    if (fd < 0) {
        std.debug.print("time zone {s}: cannot open {s}\n", .{ name, path });
        return error.UnknownTimezone;
    }
    defer _ = std.c.close(fd);
    var out: std.ArrayList(u8) = .empty;
    try out.appendSlice(gpa, name);
    try out.append(gpa, '\n');
    var buf: [1 << 14]u8 = undefined;
    // TZif files are a few kilobytes; the bound stops a wrong path early.
    while (out.items.len < 1 << 20) {
        const n = std.c.read(fd, &buf, buf.len);
        if (n <= 0) break;
        try out.appendSlice(gpa, buf[0..@intCast(n)]);
    }
    if (out.items.len < name.len + 1 + 44 or !std.mem.eql(u8, out.items[name.len + 1 ..][0..4], "TZif")) return error.UnknownTimezone;
    return out.toOwnedSlice(gpa);
}
