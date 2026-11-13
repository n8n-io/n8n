//! Outbound name and address rules for runs against the ai-gym, which
//! simulates vendor APIs (`--gym-env`). It does natively what the gym's
//! `deploy/e2e/host/resolve.cjs` does for Node.js processes:
//!
//! * A host that matches `GYM_HOSTS` resolves to `GYM_ADDR`. A pattern
//!   `*.example.com` is one whole first label; `*-example.com` is a first
//!   label that ends in `-example` with something in front (the gym's
//!   `contract.MatchHost`).
//! * Other names go to the gym's resolver (`GYM_DNS`). A matching name
//!   that the resolver pins to a loopback address other than 127.0.0.1 (a
//!   sidecar) keeps that address.
//! * A connection to `GYM_ADDR:<port>`, or to loopback on a port that
//!   `GYM_PORT_MAP` maps, goes to `127.0.0.1:<mapped port>`. Only the
//!   socket address changes: TLS SNI and the certificate check keep the
//!   vendor host name.
const std = @import("std");
const sys = @import("sys.zig");

/// GYM_PORT_MAP pairs (resolve.cjs has no limit; the gym maps a few dozen).
pub const max_ports = 1024;

pub const Gym = struct {
    addr: [4]u8,
    /// The `GYM_HOSTS` list as it is. `matches` reads it, so there is no
    /// limit on the number of patterns (the gym has hundreds).
    patterns: []const u8 = "",
    npatterns: u32 = 0,
    ports: [max_ports][2]u16 = undefined,
    nports: u32 = 0,
    /// `127.0.0.1:<port>` of the gym's resolver, or empty.
    dns: []const u8 = "",

    /// Read GYM_ADDR, GYM_HOSTS, GYM_DNS and GYM_PORT_MAP. The strings must
    /// outlive the result (they come from the process environment).
    pub fn fromEnv(getenv: *const fn ([]const u8) ?[]const u8) error{ NoGymAddr, BadGymAddr, BadPortMap }!Gym {
        const addr_text = getenv("GYM_ADDR") orelse return error.NoGymAddr;
        var g: Gym = .{ .addr = sys.parseIp4(addr_text) orelse return error.BadGymAddr };
        g.setPatterns(getenv("GYM_HOSTS") orelse "");
        try g.setPortMap(getenv("GYM_PORT_MAP") orelse "");
        g.dns = getenv("GYM_DNS") orelse "";
        return g;
    }

    pub fn setPatterns(g: *Gym, list: []const u8) void {
        g.patterns = list;
        g.npatterns = 0;
        var it = std.mem.tokenizeScalar(u8, list, ',');
        while (it.next()) |raw| {
            if (std.mem.trim(u8, raw, " \t").len > 0) g.npatterns += 1;
        }
        std.debug.assert(g.npatterns <= list.len);
    }

    /// `"443=<port>,80=<port>"`. Entries that are not two positive port
    /// numbers are skipped, as resolve.cjs does; more than 32 is an error.
    pub fn setPortMap(g: *Gym, list: []const u8) error{BadPortMap}!void {
        g.nports = 0;
        var it = std.mem.tokenizeScalar(u8, list, ',');
        while (it.next()) |kv| {
            const eq = std.mem.indexOfScalar(u8, kv, '=') orelse continue;
            const a = std.fmt.parseInt(u16, std.mem.trim(u8, kv[0..eq], " \t"), 10) catch continue;
            const b = std.fmt.parseInt(u16, std.mem.trim(u8, kv[eq + 1 ..], " \t"), 10) catch continue;
            if (a == 0 or b == 0) continue;
            if (g.nports == max_ports) return error.BadPortMap;
            g.ports[g.nports] = .{ a, b };
            g.nports += 1;
        }
    }

    pub fn mappedPort(g: *const Gym, port: u16) ?u16 {
        for (g.ports[0..g.nports]) |p| if (p[0] == port) return p[1];
        return null;
    }

    /// contract.MatchHost: exact (case-insensitive, a final dot ignored),
    /// `*.<rest>` with one non-empty first label, or `*-<tail>.<rest>` with a
    /// first label that ends in `-<tail>` and has something in front.
    pub fn matches(g: *const Gym, host_in: []const u8) bool {
        const host = std.mem.trimEnd(u8, host_in, ".");
        var it = std.mem.tokenizeScalar(u8, g.patterns, ',');
        while (it.next()) |raw| {
            if (matchOne(std.mem.trim(u8, raw, " \t"), host)) return true;
        }
        return false;
    }

    /// Where a connection to `a` really goes.
    pub fn redirect(g: *const Gym, a: sys.Addr) sys.Addr {
        const loop = sys.Addr.ip4(.{ 127, 0, 0, 1 }, 0);
        if (!a.v6) {
            if (std.mem.eql(u8, a.ip[0..4], &g.addr)) return withPort(loop, g.mappedPort(a.port) orelse a.port);
            if (a.ip[0] == 127) if (g.mappedPort(a.port)) |p| return withPort(loop, p);
            return a;
        }
        // ::ffff:a.b.c.d and ::1.
        const mapped_prefix = @as([10]u8, @splat(0)) ++ [_]u8{ 0xff, 0xff };
        const is_mapped = std.mem.eql(u8, a.ip[0..12], &mapped_prefix);
        if (is_mapped and std.mem.eql(u8, a.ip[12..16], &g.addr)) return withPort(loop, g.mappedPort(a.port) orelse a.port);
        const is_loop6 = std.mem.eql(u8, &a.ip, &(@as([15]u8, @splat(0)) ++ [_]u8{1}));
        if (is_loop6 or (is_mapped and a.ip[12] == 127)) if (g.mappedPort(a.port)) |p| return withPort(loop, p);
        return a;
    }

    /// The address of a name after the gym's rules. `resolved` is what the
    /// resolver answered (null on failure or when it was not asked).
    pub fn answer(g: *const Gym, host: []const u8, resolved: ?sys.Addr) ?sys.Addr {
        if (!g.matches(host)) return resolved;
        // A sidecar's own loopback pin stays; 127.0.0.1 is this runtime's
        // protocol listener and gets GYM_ADDR, so the port map applies.
        if (resolved) |r| if (!r.v6 and r.ip[0] == 127 and !(r.ip[1] == 0 and r.ip[2] == 0 and r.ip[3] == 1)) return r;
        return sys.Addr.ip4(g.addr, 0);
    }
};

fn withPort(a: sys.Addr, port: u16) sys.Addr {
    var b = a;
    b.port = port;
    return b;
}

fn matchOne(p: []const u8, host: []const u8) bool {
    if (p.len == 0) return false;
    if (p[0] != '*') return std.ascii.eqlIgnoreCase(host, p);
    const dot = std.mem.indexOfScalar(u8, host, '.') orelse return false;
    if (dot == 0) return false;
    if (std.mem.startsWith(u8, p, "*.")) return std.ascii.eqlIgnoreCase(host[dot + 1 ..], p[2..]);
    // "*-tail.rest": the first label ends in "-tail" and is longer than it.
    const rest = p[1..];
    const tail_dot = std.mem.indexOfScalar(u8, rest, '.') orelse return false;
    if (tail_dot == 0) return false;
    const tail = rest[0..tail_dot];
    const label = host[0..dot];
    return std.ascii.eqlIgnoreCase(host[dot..], rest[tail_dot..]) and label.len > tail.len and
        std.ascii.eqlIgnoreCase(label[label.len - tail.len ..], tail);
}

test "regression: every GYM_HOSTS pattern counts, also past 128 (the gym has 367)" {
    var list: std.ArrayList(u8) = .empty;
    defer list.deinit(std.testing.allocator);
    for (0..400) |i| try list.print(std.testing.allocator, "host{d}.example.com,", .{i});
    var g: Gym = .{ .addr = .{ 10, 0, 0, 9 } };
    g.setPatterns(list.items);
    try std.testing.expectEqual(@as(u32, 400), g.npatterns);
    try std.testing.expect(g.matches("host0.example.com"));
    try std.testing.expect(g.matches("host399.example.com"));
    try std.testing.expect(!g.matches("host400.example.com"));
}

test "host patterns follow contract.MatchHost" {
    var g: Gym = .{ .addr = .{ 10, 0, 0, 9 } };
    g.setPatterns(" api.openai.com, *.slack.com,*-aiplatform.googleapis.com ,");
    try std.testing.expectEqual(@as(u32, 3), g.npatterns);
    try std.testing.expect(g.matches("api.openai.com"));
    try std.testing.expect(g.matches("API.OpenAI.com."));
    try std.testing.expect(!g.matches("x.api.openai.com"));
    try std.testing.expect(g.matches("hooks.slack.com"));
    try std.testing.expect(!g.matches("slack.com"));
    try std.testing.expect(!g.matches("a.b.slack.com"));
    try std.testing.expect(!g.matches(".slack.com"));
    try std.testing.expect(g.matches("us-central1-aiplatform.googleapis.com"));
    try std.testing.expect(!g.matches("-aiplatform.googleapis.com"));
    try std.testing.expect(!g.matches("aiplatform.googleapis.com"));
    try std.testing.expect(!g.matches("us-aiplatform.googleapis.com.evil"));
    try std.testing.expect(!g.matches("us-other.googleapis.com"));
}

test "port map and redirects" {
    var g: Gym = .{ .addr = .{ 10, 0, 0, 9 } };
    try g.setPortMap("443=18443, 80=18080,bad,0=1,6379=x");
    try std.testing.expectEqual(@as(u32, 2), g.nports);
    try std.testing.expectEqual(@as(u16, 18443), g.mappedPort(443).?);
    try std.testing.expect(g.mappedPort(22) == null);
    const loop = sys.Addr.ip4(.{ 127, 0, 0, 1 }, 18443);
    try std.testing.expect(g.redirect(sys.Addr.ip4(.{ 10, 0, 0, 9 }, 443)).eql(loop));
    // GYM_ADDR on an unmapped port keeps the port.
    try std.testing.expect(g.redirect(sys.Addr.ip4(.{ 10, 0, 0, 9 }, 1433)).eql(sys.Addr.ip4(.{ 127, 0, 0, 1 }, 1433)));
    // Loopback on a mapped port; loopback elsewhere and other hosts stay.
    try std.testing.expect(g.redirect(sys.Addr.ip4(.{ 127, 0, 0, 5 }, 443)).eql(loop));
    try std.testing.expect(g.redirect(sys.Addr.ip4(.{ 127, 0, 0, 1 }, 5678)).eql(sys.Addr.ip4(.{ 127, 0, 0, 1 }, 5678)));
    try std.testing.expect(g.redirect(sys.Addr.ip4(.{ 8, 8, 8, 8 }, 443)).eql(sys.Addr.ip4(.{ 8, 8, 8, 8 }, 443)));
    var v6: sys.Addr = .{ .v6 = true, .port = 443 };
    v6.ip[15] = 1;
    try std.testing.expect(g.redirect(v6).eql(loop));
    var m: sys.Addr = .{ .v6 = true, .port = 80 };
    m.ip[10] = 0xff;
    m.ip[11] = 0xff;
    @memcpy(m.ip[12..16], &[_]u8{ 10, 0, 0, 9 });
    try std.testing.expect(g.redirect(m).eql(sys.Addr.ip4(.{ 127, 0, 0, 1 }, 18080)));
    // resolve.cjs takes any number of pairs: a long map is no error here.
    var long: [16 * 200]u8 = undefined;
    var ln: usize = 0;
    for (1..201) |i| ln += (std.fmt.bufPrint(long[ln..], "{d}={d},", .{ i, i + 30000 }) catch unreachable).len;
    try g.setPortMap(long[0..ln]);
    try std.testing.expectEqual(@as(u32, 200), g.nports);
    // An IP-literal URL to the gym address on an unmapped port: same port on loopback.
    try std.testing.expect(g.redirect(sys.Addr.ip4(.{ 10, 0, 0, 9 }, 5678)).eql(sys.Addr.ip4(.{ 127, 0, 0, 1 }, 5678)));
    // And on a mapped port (the 150th pair), from the gym address and from loopback.
    try std.testing.expect(g.redirect(sys.Addr.ip4(.{ 10, 0, 0, 9 }, 150)).eql(sys.Addr.ip4(.{ 127, 0, 0, 1 }, 30150)));
    try std.testing.expect(g.redirect(sys.Addr.ip4(.{ 127, 0, 0, 1 }, 150)).eql(sys.Addr.ip4(.{ 127, 0, 0, 1 }, 30150)));
}

test "answers for gym names" {
    var g: Gym = .{ .addr = .{ 10, 0, 0, 9 } };
    g.setPatterns("*.example.com,redis.sim");
    const gym = sys.Addr.ip4(.{ 10, 0, 0, 9 }, 0);
    try std.testing.expect(g.answer("api.example.com", null).?.eql(gym));
    try std.testing.expect(g.answer("api.example.com", sys.Addr.ip4(.{ 127, 0, 0, 1 }, 0)).?.eql(gym));
    try std.testing.expect(g.answer("redis.sim", sys.Addr.ip4(.{ 127, 0, 0, 5 }, 0)).?.eql(sys.Addr.ip4(.{ 127, 0, 0, 5 }, 0)));
    try std.testing.expect(g.answer("other.org", null) == null);
    try std.testing.expect(g.answer("other.org", sys.Addr.ip4(.{ 1, 2, 3, 4 }, 0)).?.eql(sys.Addr.ip4(.{ 1, 2, 3, 4 }, 0)));
}
