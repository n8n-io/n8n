//! Name resolution with c-ares, driven by the shard's poller. Results are
//! kept in a small cache for their TTL. Numeric hosts and `localhost` never
//! reach this file (see `sys.numericAddr`). Without `-Dnet` every lookup
//! fails with a clear message.
const std = @import("std");
const build_options = @import("build_options");
const sys = @import("sys.zig");

pub const enabled = build_options.net;

const Channel = opaque {};

const Options = extern struct {
    flags: c_int = 0,
    timeout: c_int = 0,
    tries: c_int = 0,
    ndots: c_int = 0,
    udp_port: c_ushort = 0,
    tcp_port: c_ushort = 0,
    socket_send_buffer_size: c_int = 0,
    socket_receive_buffer_size: c_int = 0,
    servers: ?*anyopaque = null,
    nservers: c_int = 0,
    domains: ?*anyopaque = null,
    ndomains: c_int = 0,
    lookups: ?*anyopaque = null,
    sock_state_cb: ?*const fn (?*anyopaque, c_int, c_int, c_int) callconv(.c) void = null,
    sock_state_cb_data: ?*anyopaque = null,
    // The rest of `struct ares_options`. c-ares reads only the members
    // named in the option mask, so this padding is never read.
    rest: [256]u8 = @splat(0),
};

const AddrInfoNode = extern struct {
    ai_ttl: c_int,
    ai_flags: c_int,
    ai_family: c_int,
    ai_socktype: c_int,
    ai_protocol: c_int,
    ai_addrlen: c_uint,
    ai_addr: ?*const std.c.sockaddr,
    ai_next: ?*AddrInfoNode,
};

const AddrInfo = extern struct {
    cnames: ?*anyopaque,
    nodes: ?*AddrInfoNode,
    name: ?[*:0]u8,
};

const Hints = extern struct { ai_flags: c_int = 0, ai_family: c_int = 0, ai_socktype: c_int = 0, ai_protocol: c_int = 0 };

comptime {
    // These mirror the C structs of ares.h by hand: check the layout that
    // c-ares 1.x has on 64-bit targets (LP64). `Options` stops after the
    // last member that is set; c-ares reads only members in the mask.
    if (@sizeOf(usize) == 8) {
        std.debug.assert(@offsetOf(Options, "timeout") == 4 and @offsetOf(Options, "tries") == 8);
        std.debug.assert(@offsetOf(Options, "udp_port") == 16 and @offsetOf(Options, "servers") == 32);
        std.debug.assert(@offsetOf(Options, "domains") == 48 and @offsetOf(Options, "lookups") == 64);
        std.debug.assert(@offsetOf(Options, "sock_state_cb") == 72 and @offsetOf(Options, "sock_state_cb_data") == 80);
        std.debug.assert(@sizeOf(AddrInfoNode) == 40 and @offsetOf(AddrInfoNode, "ai_addr") == 24 and @offsetOf(AddrInfoNode, "ai_next") == 32);
        std.debug.assert(@sizeOf(AddrInfo) == 24 and @offsetOf(AddrInfo, "nodes") == 8);
        std.debug.assert(@sizeOf(Hints) == 16);
    }
}

const AddrInfoCallback = *const fn (?*anyopaque, c_int, c_int, ?*AddrInfo) callconv(.c) void;

extern fn ares_init_options(channel: *?*Channel, options: *const Options, optmask: c_int) c_int;
extern fn ares_destroy(channel: *Channel) void;
extern fn ares_getaddrinfo(channel: *Channel, node: [*:0]const u8, service: ?[*:0]const u8, hints: *const Hints, cb: AddrInfoCallback, arg: ?*anyopaque) void;
extern fn ares_freeaddrinfo(ai: *AddrInfo) void;
extern fn ares_process_fd(channel: *Channel, read_fd: c_int, write_fd: c_int) void;
extern fn ares_strerror(code: c_int) [*:0]const u8;
extern fn ares_set_servers_ports_csv(channel: *Channel, csv: [*:0]const u8) c_int;

const ARES_OPT_TRIES = 1 << 2;
const ARES_OPT_SOCK_STATE_CB = 1 << 9;
const ARES_OPT_TIMEOUTMS = 1 << 13;
const ARES_SOCKET_BAD: c_int = -1;
const SOCK_STREAM = 1;

pub const max_addrs = 4;
pub const max_host = 253;

/// Up to four addresses for one name, in the order c-ares returns them.
pub const Addrs = struct {
    n: u8 = 0,
    list: [max_addrs]sys.Addr = undefined,
};

const CacheEntry = struct {
    hash: u64 = 0,
    host_len: u8 = 0,
    host: [max_host]u8 = undefined,
    expires_ms: i64 = 0,
    addrs: Addrs = .{},
};

const QState = enum { free, running, done };

const Query = struct {
    state: QState = .free,
    hash: u64 = 0,
    host_len: u8 = 0,
    host: [max_host + 1]u8 = undefined,
    ok: bool = false,
    addrs: Addrs = .{},
    err: [128]u8 = undefined,
    err_len: u8 = 0,
    resolver: *Resolver = undefined,
};

pub const Lookup = union(enum) {
    hit: Addrs,
    /// Wait for `takeDone` to return this query id.
    pending: u16,
    err: []const u8,
};

pub const cache_size = 256;
pub const max_queries = 64;
/// TTLs above this are cut, so a name that moves is seen within an hour.
const max_ttl_s = 3600;

pub const Resolver = struct {
    channel: ?*Channel = null,
    poller: *sys.Poller,
    token_kind: u8,
    cache: [cache_size]CacheEntry = @splat(.{}),
    queries: [max_queries]Query = @splat(.{}),
    running: u32 = 0,
    ndone: u32 = 0,
    last_process_ms: i64 = 0,
    now_ms: i64 = 0,

    /// `r` must not move after this call: c-ares keeps a pointer to it.
    /// `servers`: `host:port` resolvers to use instead of the system's, for
    /// example the ai-gym's resolver.
    pub fn init(r: *Resolver, poller: *sys.Poller, token_kind: u8, servers: ?[:0]const u8) !void {
        r.* = .{ .poller = poller, .token_kind = token_kind };
        for (&r.queries) |*q| q.resolver = r;
        if (!enabled) return;
        var o: Options = .{ .timeout = 2000, .tries = 2, .sock_state_cb = sockState, .sock_state_cb_data = r };
        if (ares_init_options(&r.channel, &o, ARES_OPT_SOCK_STATE_CB | ARES_OPT_TIMEOUTMS | ARES_OPT_TRIES) != 0) return error.DnsInit;
        if (servers) |sv| if (ares_set_servers_ports_csv(r.channel.?, sv.ptr) != 0) return error.DnsServers;
    }

    /// Free the c-ares channel.
    pub fn deinit(r: *Resolver) void {
        if (!enabled) return;
        if (r.channel) |ch| ares_destroy(ch);
        r.channel = null;
    }

    fn sockState(data: ?*anyopaque, fd: c_int, readable: c_int, writable: c_int) callconv(.c) void {
        const r: *Resolver = @ptrCast(@alignCast(data.?));
        const tok = sys.makeToken(r.token_kind, 0, @intCast(fd));
        if (readable == 0 and writable == 0) {
            r.poller.watch(fd, tok, false, false);
            r.poller.remove(fd);
        } else {
            r.poller.watch(fd, tok, readable != 0, writable != 0);
        }
    }

    /// Resolve `host` (lower case, no brackets). A hit returns at once.
    pub fn lookup(r: *Resolver, host: []const u8, now_ms: i64) Lookup {
        std.debug.assert(host.len > 0);
        if (!enabled) return .{ .err = "this build has no DNS resolver (built with -Dnet=false)" };
        if (host.len > max_host) return .{ .err = "the host name is too long" };
        r.now_ms = now_ms;
        const h = std.hash.Wyhash.hash(0, host);
        for (&r.cache) |*e| {
            if (e.hash == h and e.host_len == host.len and std.mem.eql(u8, e.host[0..e.host_len], host)) {
                if (e.expires_ms > now_ms) return .{ .hit = e.addrs };
                e.hash = 0;
                break;
            }
        }
        // Join a query for the same name that is still running.
        for (&r.queries, 0..) |*q, i| {
            if (q.state == .running and q.hash == h and std.mem.eql(u8, q.host[0..q.host_len], host)) return .{ .pending = @intCast(i) };
        }
        const qi = for (&r.queries, 0..) |*q, i| {
            if (q.state == .free) break i;
        } else return .{ .err = "too many DNS queries in flight" };
        const q = &r.queries[qi];
        q.state = .running;
        q.hash = h;
        q.host_len = @intCast(host.len);
        @memcpy(q.host[0..host.len], host);
        q.host[host.len] = 0;
        q.ok = false;
        q.err_len = 0;
        r.running += 1;
        const hints: Hints = .{ .ai_family = std.c.AF.UNSPEC, .ai_socktype = SOCK_STREAM };
        // The callback can run before this returns (hosts file, cache).
        ares_getaddrinfo(r.channel.?, q.host[0..host.len :0], null, &hints, onAddrInfo, q);
        return .{ .pending = @intCast(qi) };
    }

    fn onAddrInfo(arg: ?*anyopaque, status: c_int, timeouts: c_int, res: ?*AddrInfo) callconv(.c) void {
        _ = timeouts;
        const q: *Query = @ptrCast(@alignCast(arg.?));
        const r = q.resolver;
        defer if (res) |ai| ares_freeaddrinfo(ai);
        if (q.state != .running) return;
        q.state = .done;
        r.running -= 1;
        r.ndone += 1;
        if (status != 0 or res == null) {
            const t = std.mem.span(ares_strerror(status));
            const n = @min(t.len, q.err.len);
            @memcpy(q.err[0..n], t[0..n]);
            q.err_len = @intCast(n);
            return;
        }
        var addrs: Addrs = .{};
        var ttl: c_int = max_ttl_s;
        var node = res.?.nodes;
        var guard: u32 = 0;
        while (node) |nd| : (guard += 1) {
            if (guard >= 64 or addrs.n == max_addrs) break;
            node = nd.ai_next;
            const sa = nd.ai_addr orelse continue;
            if (nd.ai_family == std.c.AF.INET) {
                const in4: *const std.c.sockaddr.in = @ptrCast(@alignCast(sa));
                addrs.list[addrs.n] = sys.Addr.ip4(@bitCast(in4.addr), 0);
            } else if (nd.ai_family == std.c.AF.INET6) {
                const in6: *const std.c.sockaddr.in6 = @ptrCast(@alignCast(sa));
                addrs.list[addrs.n] = .{ .v6 = true, .ip = in6.addr };
            } else continue;
            addrs.n += 1;
            ttl = @min(ttl, @max(nd.ai_ttl, 0));
        }
        if (addrs.n == 0) {
            const t = "no addresses for this name";
            @memcpy(q.err[0..t.len], t);
            q.err_len = t.len;
            return;
        }
        q.ok = true;
        q.addrs = addrs;
        r.store(q.host[0..q.host_len], q.hash, addrs, ttl);
    }

    /// Replace an expired entry, else the one that expires first.
    fn store(r: *Resolver, host: []const u8, h: u64, addrs: Addrs, ttl_s: c_int) void {
        if (ttl_s <= 0) return;
        var victim: usize = 0;
        for (&r.cache, 0..) |*e, i| {
            if (e.hash == 0 or e.expires_ms <= r.now_ms) {
                victim = i;
                break;
            }
            if (e.expires_ms < r.cache[victim].expires_ms) victim = i;
        }
        const e = &r.cache[victim];
        e.hash = h;
        e.host_len = @intCast(host.len);
        @memcpy(e.host[0..host.len], host);
        e.expires_ms = r.now_ms + @as(i64, ttl_s) * 1000;
        e.addrs = addrs;
    }

    pub fn onReady(r: *Resolver, fd: c_int, ev: sys.Ready) void {
        if (!enabled or r.channel == null) return;
        ares_process_fd(r.channel.?, if (ev.readable or ev.eof) fd else ARES_SOCKET_BAD, if (ev.writable) fd else ARES_SOCKET_BAD);
    }

    /// Let c-ares retry and time out queries. Call it often; it does
    /// work at most every 100 ms and only while queries run.
    pub fn tick(r: *Resolver, now_ms: i64) void {
        if (!enabled or r.running == 0) return;
        if (now_ms - r.last_process_ms < 100) return;
        r.last_process_ms = now_ms;
        r.now_ms = now_ms;
        ares_process_fd(r.channel.?, ARES_SOCKET_BAD, ARES_SOCKET_BAD);
    }

    pub const Done = struct { id: u16, result: Lookup };

    /// One finished query, or null. The result is valid until the next
    /// call; the query slot is free after it.
    pub fn takeDone(r: *Resolver) ?Done {
        if (r.ndone == 0) return null;
        for (&r.queries, 0..) |*q, i| {
            if (q.state != .done) continue;
            q.state = .free;
            r.ndone -= 1;
            return .{ .id = @intCast(i), .result = if (q.ok) .{ .hit = q.addrs } else .{ .err = q.err[0..q.err_len] } };
        }
        unreachable;
    }

    pub fn hasDone(r: *const Resolver) bool {
        return r.ndone > 0;
    }
};
