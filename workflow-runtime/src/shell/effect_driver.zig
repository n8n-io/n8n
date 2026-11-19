//! One registry for the protocol I/O drivers of the shell: PostgreSQL,
//! MySQL, SQL Server and SMTP. Each driver is one entry of a comptime
//! table, so a new driver is one row, not several switch arms. The table
//! gives the shared shape of every client one name: make it, run its
//! events, drain its results and count its limits.
const std = @import("std");
const core_lib = @import("core");
const core = core_lib.core;
const creds = @import("creds.zig");
const sys = @import("sys.zig");
const pg = @import("pg.zig");
const my = @import("my.zig");
const ms = @import("ms.zig");
const smtp = @import("smtp.zig");
const my_call = @import("my_call.zig");
const ms_call = @import("ms_call.zig");
const net_pool = @import("net_pool.zig");

/// The drivers of the native I/O effects.
pub const DriverId = enum(u8) { pg, mysql, mssql, smtp };

/// The token kind of each driver's connection and name-lookup events, in
/// the `Kind` enum of `server.zig`.
pub const kind_sql = 13;
pub const kind_sql_dns = 14;
pub const kind_mysql = 16;
pub const kind_mysql_dns = 17;
pub const kind_smtp = 19;
pub const kind_smtp_dns = 20;
pub const kind_mssql = 21;
pub const kind_mssql_dns = 22;

/// One entry of the driver table.
const Driver = struct {
    id: DriverId,
    /// The field of the runner that holds the client.
    slot: []const u8,
    /// True when the slot is an optional pointer (`?*Client`): SMTP.
    optional: bool,
    /// True when the client pools connections (`conns`, `cfree`): the SQL
    /// dialects. False: SMTP, whose call owns its one connection.
    pooled: bool,
    kind_conn: u8,
    kind_dns: u8,
};

/// The four drivers, one row each.
const drivers = [_]Driver{
    .{ .id = .pg, .slot = "sql", .optional = false, .pooled = true, .kind_conn = kind_sql, .kind_dns = kind_sql_dns },
    .{ .id = .mysql, .slot = "mysql", .optional = false, .pooled = true, .kind_conn = kind_mysql, .kind_dns = kind_mysql_dns },
    .{ .id = .mssql, .slot = "mssql", .optional = false, .pooled = true, .kind_conn = kind_mssql, .kind_dns = kind_mssql_dns },
    .{ .id = .smtp, .slot = "mail", .optional = true, .pooled = false, .kind_conn = kind_smtp, .kind_dns = kind_smtp_dns },
};

/// The MySQL client shares the limits of the PostgreSQL client (the
/// `--sql-*` flags). Its connect time stays its own default.
fn toMyConfig(scfg: pg.Config) my.Config {
    return .{
        .max_reqs = scfg.max_reqs,
        .max_conns = scfg.max_conns,
        .pool_conns = scfg.pool_conns,
        .max_pools = scfg.max_pools,
        .max_result = scfg.max_result,
        .max_request = scfg.max_request,
        .max_statements = scfg.max_statements,
        .idle_ms = scfg.idle_ms,
        .total_ms = scfg.total_ms,
        .insecure_tls = scfg.insecure_tls,
        .ca_file = scfg.ca_file,
        .dns_servers = scfg.dns_servers,
        .credentials = scfg.credentials,
    };
}

/// The SQL Server client shares the limits of the PostgreSQL client (the
/// `--sql-*` flags).
fn toMsConfig(scfg: pg.Config) ms.Config {
    return .{
        .max_reqs = scfg.max_reqs,
        .max_conns = scfg.max_conns,
        .pool_conns = scfg.pool_conns,
        .max_pools = scfg.max_pools,
        .max_result = scfg.max_result,
        .max_request = scfg.max_request,
        .max_statements = scfg.max_statements,
        .idle_ms = scfg.idle_ms,
        .total_ms = scfg.total_ms,
        .insecure_tls = scfg.insecure_tls,
        .ca_file = scfg.ca_file,
        .dns_servers = scfg.dns_servers,
        .credentials = scfg.credentials,
    };
}

/// The PostgreSQL config with the shared TLS and DNS settings.
fn sqlConfig(opts: anytype) pg.Config {
    var c = opts.sql;
    c.insecure_tls = opts.insecure_tls;
    c.ca_file = opts.ca_file;
    c.dns_servers = opts.gym_dns;
    return c;
}

/// The SMTP config with the shared TLS and DNS settings.
fn smtpConfig(opts: anytype) smtp.Config {
    var c = opts.smtp;
    c.insecure_tls = opts.insecure_tls;
    c.ca_file = opts.ca_file;
    c.dns_servers = opts.gym_dns;
    return c;
}

/// Make the four clients and reserve their buffers.
pub fn initAll(r: anytype, gpa: std.mem.Allocator) !void {
    const scfg = sqlConfig(r.opts);
    r.sql = try gpa.create(pg.Client);
    try r.sql.init(gpa, scfg, &r.poller, kind_sql, kind_sql_dns);
    r.mysql = try gpa.create(my.Client);
    try r.mysql.init(gpa, toMyConfig(scfg), &r.poller, kind_mysql, kind_mysql_dns);
    r.mssql = try gpa.create(ms.Client);
    try r.mssql.init(gpa, toMsConfig(scfg), &r.poller, kind_mssql, kind_mssql_dns);
    r.mail = null;
    if (r.opts.smtp_native) try initSmtp(r, gpa);
}

/// Make the SMTP client and reserve its buffers.
pub fn initSmtp(r: anytype, gpa: std.mem.Allocator) !void {
    const m = try gpa.create(smtp.Client);
    try m.init(gpa, smtpConfig(r.opts), &r.poller, kind_smtp, kind_smtp_dns);
    r.mail = m;
}

/// Close the connections and free what the clients hold.
pub fn deinitAll(r: anytype) void {
    r.sql.deinit();
    r.mysql.deinit();
    r.mssql.deinit();
    if (r.mail) |m| m.deinit();
}

/// True when a driver has finished work and the loop must not sleep.
pub fn hasWork(r: anytype) bool {
    inline for (drivers) |d| {
        if (d.optional) {
            if (@field(r, d.slot)) |c| {
                if (c.hasWork()) return true;
            }
        } else if (@field(r, d.slot).hasWork()) return true;
    }
    return false;
}

/// Run each driver's work after a round of events.
pub fn tickAll(r: anytype, now: i64) void {
    inline for (drivers) |d| {
        if (d.optional) {
            if (@field(r, d.slot)) |c| c.afterEvents(now);
        } else {
            @field(r, d.slot).afterEvents(now);
        }
    }
}

/// Route a readiness event of a driver: its connection or its name lookup.
/// True when `kind` is a driver kind, so the caller can stop.
pub fn handleToken(r: anytype, kind: u8, idx: u32, gen: u32, ev: sys.Ready, now_ms: i64) bool {
    inline for (drivers) |d| {
        if (kind == d.kind_conn) {
            onConn(r, d, idx, gen, ev, now_ms);
            return true;
        }
        if (kind == d.kind_dns) {
            onDns(r, d, idx, ev);
            return true;
        }
    }
    return false;
}

fn onConn(r: anytype, comptime d: Driver, idx: u32, gen: u32, ev: sys.Ready, now_ms: i64) void {
    if (d.optional) {
        const c = @field(r, d.slot) orelse return;
        c.onConn(idx, gen, ev, now_ms);
    } else {
        @field(r, d.slot).onConn(idx, gen, ev, now_ms);
    }
}

fn onDns(r: anytype, comptime d: Driver, idx: u32, ev: sys.Ready) void {
    if (d.optional) {
        const c = @field(r, d.slot) orelse return;
        c.onDns(@intCast(idx), ev);
    } else {
        @field(r, d.slot).onDns(@intCast(idx), ev);
    }
}

/// Hand the finished calls of every driver to the core, oldest first.
pub fn drainAll(r: anytype) void {
    inline for (drivers) |d| drainOne(r, d);
}

fn drainOne(r: anytype, comptime d: Driver) void {
    const max_reqs: u32 = if (d.pooled) r.opts.sql.max_reqs else r.opts.smtp.max_reqs;
    if (d.optional) {
        const c = @field(r, d.slot) orelse return;
        drainClient(r, c, max_reqs, "smtp: the result does not fit in the batch memory (limit)");
    } else {
        drainClient(r, @field(r, d.slot), max_reqs, "sql: the result does not fit in the batch memory (limit)");
    }
}

/// Hand the finished calls of one client to the core, oldest first, as the
/// event list has room. A call keeps its slot until then.
fn drainClient(r: anytype, client: anytype, max_reqs: u32, comptime full: []const u8) void {
    for (0..max_reqs) |_| {
        const done = client.nextDone() orelse return;
        if (r.events.items.len + r.resultReserve() >= r.events.capacity) return;
        const kind: core.EventKind = if (done.ok) .effect_ok else .effect_err;
        if (r.batch.dupe(done.payload)) |p| {
            r.events.appendAssumeCapacity(.{ .kind = kind, .exec_id = done.exec_id, .seq = done.seq, .payload = p });
        } else |_| {
            // The batch memory is full of other results: they go first.
            if (r.events.items.len > 0) return;
            r.events.appendAssumeCapacity(.{ .kind = .effect_err, .exec_id = done.exec_id, .seq = done.seq, .payload = full });
        }
        client.release(done.req);
    }
}

/// Request and connection counts of one driver, for `/_admin/limits`.
pub const Gauges = struct {
    req_used: u32,
    req_max: u32,
    conn_used: u32,
    conn_max: u32,
};

/// The counts of `id` on `r`.
pub fn gauges(r: anytype, id: DriverId) Gauges {
    inline for (drivers) |d| {
        if (d.id == id) return gaugesOf(r, d);
    }
    // A DriverId names one entry of the table, so this line is not reached.
    return .{ .req_used = 0, .req_max = 0, .conn_used = 0, .conn_max = 0 };
}

fn gaugesOf(r: anytype, comptime d: Driver) Gauges {
    if (d.optional) {
        const c = @field(r, d.slot) orelse return .{ .req_used = 0, .req_max = 0, .conn_used = 0, .conn_max = 0 };
        return smtpGauges(c);
    }
    return sqlGauges(@field(r, d.slot));
}

fn sqlGauges(c: anytype) Gauges {
    const req_max: u32 = @intCast(c.reqs.len);
    const conn_max: u32 = @intCast(c.conns.len);
    return .{ .req_used = req_max - c.rfree.len, .req_max = req_max, .conn_used = conn_max - c.cfree.len, .conn_max = conn_max };
}

fn smtpGauges(c: anytype) Gauges {
    const req_max: u32 = @intCast(c.reqs.len);
    const used = req_max - c.req_free.len;
    return .{ .req_used = used, .req_max = req_max, .conn_used = used, .conn_max = req_max };
}

/// True when a SQL client of any dialect has a free call slot.
pub fn sqlRoom(r: anytype) bool {
    return r.sql.rfree.len > 0 or r.mysql.rfree.len > 0 or r.mssql.rfree.len > 0;
}

/// True when the SMTP client has a free call slot.
pub fn smtpRoom(r: anytype) bool {
    const m = r.mail orelse return false;
    return m.req_free.len > 0;
}

/// The driver of the `sql` dialect that the call names.
pub fn driverForSql(args: []const u8) DriverId {
    if (ms_call.isMssql(args)) return .mssql;
    if (my_call.isMysql(args)) return .mysql;
    return .pg;
}

/// Start the `sql` call on the client of `driver`. Null when the call
/// started, or when its synchronous error is queued; else the text of the
/// capacity limit.
pub fn submitSql(r: anytype, a: core.Action, store: ?*const creds.Store, now: i64, driver: DriverId) ?[]const u8 {
    return switch (driver) {
        .pg => r.sql.start(a.exec_id, a.seq, a.payload, store, now),
        .mysql => r.mysql.start(a.exec_id, a.seq, a.payload, store, now),
        .mssql => r.mssql.start(a.exec_id, a.seq, a.payload, store, now),
        .smtp => unreachable, // a sql call never routes to the SMTP driver
    };
}

/// Start the `smtp` call. Null when it started, or when its synchronous
/// error is queued; else the text of the capacity limit.
pub fn submitSmtp(m: anytype, a: core.Action, store: ?*const creds.Store, now: i64) ?[]const u8 {
    return m.start(a.exec_id, a.seq, a.payload, store, now);
}

// ---- tests ------------------------------------------------------------------------

test "config conversion: the SQL dialects share the pg limits" {
    const scfg: pg.Config = .{
        .max_reqs = 7,
        .max_conns = 3,
        .pool_conns = 2,
        .max_pools = 5,
        .max_result = 100,
        .max_request = 200,
        .max_statements = 9,
        .idle_ms = 10,
        .total_ms = 20,
    };
    const mycfg = toMyConfig(scfg);
    try std.testing.expectEqual(scfg.max_reqs, mycfg.max_reqs);
    try std.testing.expectEqual(scfg.max_conns, mycfg.max_conns);
    try std.testing.expectEqual(scfg.pool_conns, mycfg.pool_conns);
    try std.testing.expectEqual(scfg.max_pools, mycfg.max_pools);
    try std.testing.expectEqual(scfg.max_result, mycfg.max_result);
    try std.testing.expectEqual(scfg.max_request, mycfg.max_request);
    try std.testing.expectEqual(scfg.max_statements, mycfg.max_statements);
    try std.testing.expectEqual(scfg.idle_ms, mycfg.idle_ms);
    try std.testing.expectEqual(scfg.total_ms, mycfg.total_ms);
    const mscfg = toMsConfig(scfg);
    try std.testing.expectEqual(scfg.max_reqs, mscfg.max_reqs);
    try std.testing.expectEqual(scfg.max_conns, mscfg.max_conns);
    try std.testing.expectEqual(scfg.pool_conns, mscfg.pool_conns);
    try std.testing.expectEqual(scfg.max_pools, mscfg.max_pools);
    try std.testing.expectEqual(scfg.max_result, mscfg.max_result);
    try std.testing.expectEqual(scfg.max_request, mscfg.max_request);
    try std.testing.expectEqual(scfg.max_statements, mscfg.max_statements);
    try std.testing.expectEqual(scfg.idle_ms, mscfg.idle_ms);
    try std.testing.expectEqual(scfg.total_ms, mscfg.total_ms);
}

test "driver lookup: the dialect picks the client" {
    try std.testing.expectEqual(DriverId.pg, driverForSql("{\"dialect\":\"postgres\"}"));
    try std.testing.expectEqual(DriverId.mysql, driverForSql("{\"dialect\":\"mysql\"}"));
    try std.testing.expectEqual(DriverId.mssql, driverForSql("{\"dialect\":\"mssql\"}"));
    try std.testing.expectEqual(DriverId.pg, driverForSql("{}"));
}

const FakeSql = struct {
    reqs: []u8,
    rfree: net_pool.FreeStack(u32),
    conns: []u8,
    cfree: net_pool.FreeStack(u32),
};

const FakeSmtp = struct {
    reqs: []u8,
    req_free: net_pool.FreeStack(u32),
};

test "limits: a pooled driver counts requests and connections" {
    var reqs: [4]u8 = @splat(0);
    var rfree_items: [4]u32 = @splat(0);
    var conns: [3]u8 = @splat(0);
    var cfree_items: [3]u32 = @splat(0);
    var c = FakeSql{
        .reqs = &reqs,
        .rfree = .{ .items = &rfree_items, .len = 1 },
        .conns = &conns,
        .cfree = .{ .items = &cfree_items, .len = 2 },
    };
    const g = sqlGauges(&c);
    try std.testing.expectEqual(@as(u32, 3), g.req_used);
    try std.testing.expectEqual(@as(u32, 4), g.req_max);
    try std.testing.expectEqual(@as(u32, 1), g.conn_used);
    try std.testing.expectEqual(@as(u32, 3), g.conn_max);
}

test "limits: the SMTP driver counts one connection per call" {
    var reqs: [5]u8 = @splat(0);
    var free_items: [5]u32 = @splat(0);
    var c = FakeSmtp{
        .reqs = &reqs,
        .req_free = .{ .items = &free_items, .len = 2 },
    };
    const g = smtpGauges(&c);
    try std.testing.expectEqual(@as(u32, 3), g.req_used);
    try std.testing.expectEqual(@as(u32, 5), g.req_max);
    try std.testing.expectEqual(@as(u32, 3), g.conn_used);
    try std.testing.expectEqual(@as(u32, 5), g.conn_max);
}
