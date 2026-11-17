//! Tests of the MySQL client. The `mysql fake` tests run against the
//! scripted server of `my_fake.zig`, in the thread of the test, without a
//! database. The `mysql live` tests run against a real server when
//! `WFRT_TEST_MY` names one (`host:port`, user `root`, password in
//! `WFRT_TEST_MY_PASSWORD`, database `card`), and are skipped without it.
//! docs/sql-effect.md says which users and databases they expect.
const std = @import("std");
const sys = @import("sys.zig");
const creds = @import("creds.zig");
const my = @import("my.zig");
const fake = @import("my_fake.zig");

const kind_conn: u8 = 16;
const kind_dns: u8 = 17;
const kind_fake: u8 = 15;

const Target = struct { host: []const u8, port: []const u8, password: []const u8 };

fn target() ?Target {
    const hp = sys.getenv("WFRT_TEST_MY") orelse return null;
    const colon = std.mem.lastIndexOfScalar(u8, hp, ':') orelse return null;
    return .{ .host = hp[0..colon], .port = hp[colon + 1 ..], .password = sys.getenv("WFRT_TEST_MY_PASSWORD") orelse "" };
}

const Answer = struct { ok: bool, text: []const u8 };

const Harness = struct {
    arena: std.heap.ArenaAllocator,
    poller: sys.Poller,
    client: *my.Client,
    store: creds.Store,
    /// The scripted server, or null for a real one.
    server: ?*fake.Server = null,
    next_seq: u32 = 1,

    /// The slots: `db` (the test server), and slots that differ in one value.
    /// The harness lives in its own arena: `destroy` frees all of it.
    fn create(t: ?Target, cfg: my.Config) !*Harness {
        var arena = std.heap.ArenaAllocator.init(std.testing.allocator);
        errdefer arena.deinit();
        const a = arena.allocator();
        const h = try a.create(Harness);
        h.* = .{ .arena = arena, .poller = try sys.Poller.init(), .client = try a.create(my.Client), .store = try creds.Store.parse(a, "{}") };
        var live = t;
        if (t == null) {
            const server = try a.create(fake.Server);
            try server.init(a, &h.poller, kind_fake);
            server.password = "secret";
            h.server = server;
            live = .{ .host = "127.0.0.1", .port = try std.fmt.allocPrint(a, "{d}", .{server.port}), .password = "secret" };
        }
        const doc = try std.fmt.allocPrint(a,
            \\{{"db":{{"type":"mySql","data":{{"host":"{0s}","port":{1s},"user":"root","password":"{2s}","database":"card"}}}},
            \\"wrong":{{"data":{{"host":"{0s}","port":{1s},"user":"root","password":"not-the-password","database":"card"}}}},
            \\"nodb":{{"data":{{"host":"{0s}","port":{1s},"user":"root","password":"{2s}","database":"wfrt_no_such_db"}}}},
            \\"nat":{{"data":{{"host":"{0s}","port":{1s},"user":"nat","password":"natpw","database":"card"}}}},
            \\"sha":{{"data":{{"host":"{0s}","port":{1s},"user":"sha","password":"shapw","database":"card"}}}},
            \\"nopw":{{"data":{{"host":"{0s}","port":{1s},"user":"nopw","password":"","database":"card"}}}},
            \\"tls":{{"data":{{"host":"{0s}","port":{1s},"user":"root","password":"{2s}","database":"card","ssl":true}}}},
            \\"cert":{{"data":{{"host":"{0s}","port":{1s},"user":"root","password":"{2s}","ssl":true,"caCertificate":"-----BEGIN"}}}},
            \\"refused":{{"data":{{"host":"127.0.0.1","port":1,"user":"u","password":"p","database":"d"}}}},
            \\"nohost":{{"data":{{"host":"wfrt-no-such-host.invalid","port":3306,"user":"u","password":"p","database":"d"}}}},
            \\"ssh":{{"data":{{"host":"{0s}","port":{1s},"user":"root","password":"{2s}","database":"card","sshTunnel":true}}}}}}
        , .{ live.?.host, live.?.port, live.?.password });
        h.store = try creds.Store.parse(a, doc);
        try h.client.init(a, cfg, &h.poller, kind_conn, kind_dns);
        // The arena as it is after the last allocation above.
        h.arena = arena;
        return h;
    }

    fn destroy(h: *Harness) void {
        h.client.deinit();
        if (h.server) |s| s.deinit();
        h.poller.deinit();
        var arena = h.arena;
        arena.deinit();
    }

    fn begin(h: *Harness, args: []const u8) !u32 {
        const seq = h.next_seq;
        h.next_seq += 1;
        if (h.client.start(7, seq, args, &h.store, sys.nowMs())) |msg| {
            std.debug.print("start refused: {s}\n", .{msg});
            return error.Refused;
        }
        return seq;
    }

    /// One round of the event loop.
    fn turn(h: *Harness) void {
        var ready: [64]sys.Ready = @splat(.{ .token = 0, .readable = false, .writable = false, .eof = false });
        const n = h.poller.wait(&ready, 5);
        for (ready[0..n]) |ev| {
            const idx: u32 = @truncate(ev.token);
            const gen: u32 = @truncate((ev.token >> 32) & 0xFFFFFF);
            switch (ev.token >> 56) {
                kind_conn => h.client.onConn(idx, gen, ev, sys.nowMs()),
                kind_fake => h.server.?.onReady(ev),
                else => h.client.onDns(@intCast(idx), ev),
            }
        }
        h.client.afterEvents(sys.nowMs());
    }

    /// Run the event loop until one call ends; give its seq and its answer.
    fn wait(h: *Harness, seq_out: *u32) !Answer {
        for (0..6000) |_| {
            if (h.client.nextDone()) |d| {
                const text = try h.arena.allocator().dupe(u8, d.payload);
                seq_out.* = d.seq;
                h.client.release(d.req);
                return .{ .ok = d.ok, .text = text };
            }
            h.turn();
        }
        return error.NoAnswer;
    }

    /// Close the idle connections, and wait until no connection is open.
    fn settle(h: *Harness) !void {
        const idle = h.client.cfg.idle_ms;
        h.client.cfg.idle_ms = 0;
        defer h.client.cfg.idle_ms = idle;
        for (0..400) |_| {
            if (h.client.ncfree == h.client.cfg.max_conns) return;
            h.turn();
        }
        return error.ConnectionsStayOpen;
    }

    fn call(h: *Harness, comptime slot: []const u8, comptime rest: []const u8) !Answer {
        var seq: u32 = 0;
        _ = try h.begin("{\"credential\":\"" ++ slot ++ "\",\"dialect\":\"mysql\"," ++ rest ++ "}");
        return h.wait(&seq);
    }

    fn expectResult(h: *Harness, comptime rest: []const u8, want: []const u8) !void {
        const a = try h.call("db", rest);
        if (!a.ok) std.debug.print("effect error: {s}\n", .{a.text});
        try std.testing.expect(a.ok);
        try std.testing.expectEqualStrings(want, a.text);
    }

    fn expectError(h: *Harness, comptime slot: []const u8, comptime rest: []const u8, want_part: []const u8) !void {
        const a = try h.call(slot, rest);
        if (a.ok or std.mem.indexOf(u8, a.text, want_part) == null) std.debug.print("got ok={}: {s}\n", .{ a.ok, a.text });
        try std.testing.expect(!a.ok);
        try std.testing.expect(std.mem.indexOf(u8, a.text, want_part) != null);
    }

    fn expectPart(h: *Harness, comptime slot: []const u8, comptime rest: []const u8, want_part: []const u8) !void {
        const a = try h.call(slot, rest);
        if (!a.ok or std.mem.indexOf(u8, a.text, want_part) == null) std.debug.print("got ok={}: {s}\n", .{ a.ok, a.text });
        try std.testing.expect(a.ok);
        try std.testing.expect(std.mem.indexOf(u8, a.text, want_part) != null);
    }
};

/// One statement of a call.
fn one(comptime text: []const u8) []const u8 {
    return "\"statements\":[{\"text\":\"" ++ text ++ "\",\"simple\":true}]";
}

const long = 3;
const var_string = 253;
const geometry = 255;
const ok_tail = "\"info\":\"\",\"serverStatus\":2,\"warningStatus\":0}}";

const rules = [_]fake.Rule{
    .{ .text = "select 1 as a", .cols = &.{.{ .name = "a", .type = long }}, .rows = &.{&.{"1"}} },
    .{ .text = "select name", .cols = &.{ .{ .name = "id", .type = long }, .{ .name = "name", .type = var_string, .charset = 224 } }, .rows = &.{ &.{ "1", "a" }, &.{ "2", null } } },
    .{ .text = "insert into t values (1)", .affected = 1, .insert_id = 7 },
    .{ .text = "update t set a = 2", .affected = 3, .info = "Rows matched: 3  Changed: 2  Warnings: 0" },
    .{ .text = "select boom", .fail = .{ .code = 1146, .state = "42S02", .message = "Table 'card.boom' doesn't exist" } },
    .{ .text = "select shape", .cols = &.{.{ .name = "g", .type = geometry }}, .rows = &.{&.{"\x00"}} },
    .{ .text = "select big", .cols = &.{.{ .name = "v", .type = var_string, .charset = 224 }}, .rows = &.{&.{"0123456789012345678901234567890123456789"}}, .repeat = 400 },
    .{ .text = "create table x (a int)", .implicit_commit = true },
    .{ .text = "use other", .state_changed = true },
    .{ .text = "select hang", .act = .hang },
    .{ .text = "select close", .act = .close },
    .{ .text = "load data local infile 'f.csv' into table t", .infile = "f.csv" },
};

fn fakeHarness(cfg: my.Config) !*Harness {
    const h = try Harness.create(null, cfg);
    h.server.?.rules = &rules;
    return h;
}

test "mysql fake: the login methods, a wrong password and a method that the client does not have" {
    const h = try fakeHarness(.{});
    defer h.destroy();
    const s = h.server.?;
    const want = "{\"results\":[{\"sets\":[{\"rows\":[{\"a\":1}],\"command\":\"SELECT\",\"rowCount\":1}]}]}";
    const modes = [_]fake.Auth{ .native, .caching_fast, .caching_full, .switch_native };
    for (modes) |mode| {
        s.auth = mode;
        s.clearLog();
        // Each login is on a new connection: the one before closes first.
        try h.settle();
        try h.expectResult(one("select 1 as a"), want);
        try std.testing.expectEqual(@as(u32, 1), s.count("login root"));
        try std.testing.expectEqual(@as(u32, if (mode == .caching_full) 1 else 0), s.count("rsa 256"));
    }
    try std.testing.expectEqual(@as(u32, 4), s.logins);
    // The password never goes into a text of the client.
    try h.expectPart("wrong", one("select 1 as a"), "{\"results\":[],\"connect\":{\"message\":\"Access denied for user 'u'@'localhost' (using password: YES)\",\"code\":\"ER_ACCESS_DENIED_ERROR\",\"errno\":1045,\"sqlState\":\"28000\"");
    s.auth = .switch_unknown;
    try h.settle();
    try h.expectError("db", one("select 1 as a"), "(limit: sql-credential)");
    s.auth = .native;
    // The credential asks for TLS and the server has none.
    try h.expectPart("tls", one("select 1 as a"), "{\"results\":[],\"connect\":{\"message\":\"Server does not support secure connection\",\"code\":\"HANDSHAKE_NO_SSL_SUPPORT\"}}");
    try h.expectError("ssh", one("select 1 as a"), "(limit: sql-credential)");
    try h.expectError("cert", one("select 1 as a"), "(limit: sql-credential)");
    try h.expectPart("refused", one("select 1 as a"), "\"connect\":{\"message\":\"connect ECONNREFUSED 127.0.0.1:1\",\"code\":\"ECONNREFUSED\"}");
    try std.testing.expect(!s.failed);
}

test "mysql fake: a text gives one set for each command, and an error takes the place of the sets" {
    const h = try fakeHarness(.{});
    defer h.destroy();
    const s = h.server.?;
    try h.expectResult(one("select name; insert into t values (1); update t set a = 2"), "{\"results\":[{\"sets\":[" ++
        "{\"rows\":[{\"id\":1,\"name\":\"a\"},{\"id\":2,\"name\":null}],\"command\":\"SELECT\",\"rowCount\":2}," ++
        "{\"command\":\"OK\",\"rowCount\":1,\"rows\":[],\"ok\":{\"affectedRows\":1,\"insertId\":7,\"info\":\"\",\"serverStatus\":10,\"warningStatus\":0}}," ++
        "{\"command\":\"OK\",\"rowCount\":3,\"rows\":[],\"ok\":{\"affectedRows\":3,\"insertId\":0,\"info\":\"Rows matched: 3  Changed: 2  Warnings: 0\",\"serverStatus\":2,\"warningStatus\":0}}]}]}");
    try std.testing.expectEqual(@as(u32, 1), s.count("query select name; insert into t values (1); update t set a = 2"));
    // The commands before the failure ran; mysql2 gives only the error.
    const failure = "{\"error\":{\"message\":\"Table 'card.boom' doesn't exist\",\"code\":\"ER_NO_SUCH_TABLE\",\"errno\":1146,\"sqlState\":\"42S02\",\"sqlMessage\":\"Table 'card.boom' doesn't exist\"}}";
    try h.expectResult(one("select 1 as a; select boom; select 1 as a"), "{\"results\":[" ++ failure ++ "]}");
    try h.expectResult(one(" ; "), "{\"results\":[{\"error\":{\"message\":\"Query was empty\",\"code\":\"ER_EMPTY_QUERY\",\"errno\":1065,\"sqlState\":\"42000\",\"sqlMessage\":\"Query was empty\"}}]}");
    // `single` with more than one statement: each one alone, and the result ends with the first failure.
    s.clearLog();
    try h.expectResult(
        \\"statements":[{"text":"insert into t values (1)","simple":true},{"text":"select boom","simple":true},{"text":"select 1 as a","simple":true}]
    , "{\"results\":[{\"sets\":[{\"command\":\"OK\",\"rowCount\":1,\"rows\":[],\"ok\":{\"affectedRows\":1,\"insertId\":7," ++ ok_tail ++ "]}," ++ failure ++ "]}");
    try std.testing.expectEqual(@as(u32, 0), s.count("query select 1 as a"));
    try std.testing.expectEqual(@as(u32, 0), s.count("query START TRANSACTION"));
    // The server asks for a local file: the client has none, as mysql2 without a stream factory.
    try h.expectResult(one("load data local infile 'f.csv' into table t"), "{\"results\":[{\"error\":{\"message\":\"As a result of LOCAL INFILE command server wants to read f.csv file, " ++
        "but as of v2.0 you must provide streamFactory option returning ReadStream.\"}}]}");
    try std.testing.expectEqual(@as(u32, 1), s.count("infile empty"));
    try std.testing.expect(!s.failed);
}

test "mysql fake: the modes independently and transaction" {
    const h = try fakeHarness(.{});
    defer h.destroy();
    const s = h.server.?;
    const set = "{\"sets\":[{\"rows\":[{\"a\":1}],\"command\":\"SELECT\",\"rowCount\":1}]}";
    const failure = "{\"error\":{\"message\":\"Table 'card.boom' doesn't exist\",\"code\":\"ER_NO_SUCH_TABLE\",\"errno\":1146,\"sqlState\":\"42S02\",\"sqlMessage\":\"Table 'card.boom' doesn't exist\"}}";
    // A failure skips the later statements of its group; a statement without a group always runs.
    try h.expectResult(
        \\"mode":"independently","statements":[{"text":"select boom","simple":true,"group":0},{"text":"select 1 as a","simple":true,"group":0},
        \\{"text":"select 1 as a","simple":true,"group":1},{"text":"select boom","simple":true},{"text":"select 1 as a","simple":true},{"text":"select 1 as a","simple":true,"group":0}]
    , "{\"results\":[" ++ failure ++ ",{\"skipped\":true}," ++ set ++ "," ++ failure ++ "," ++ set ++ ",{\"skipped\":true}]}");
    // A transaction: each statement alone, then COMMIT.
    s.clearLog();
    try h.expectResult(
        \\"mode":"transaction","statements":[{"text":"select 1 as a","simple":true},{"text":"insert into t values (1)","simple":true}]
    , "{\"results\":[" ++ set ++ ",{\"sets\":[{\"command\":\"OK\",\"rowCount\":1,\"rows\":[],\"ok\":{\"affectedRows\":1,\"insertId\":7,\"info\":\"\",\"serverStatus\":3,\"warningStatus\":0}}]}]}");
    try std.testing.expectEqualStrings("reset\nquery START TRANSACTION\nquery select 1 as a\nquery insert into t values (1)\nquery COMMIT\n", s.logText());
    // The first failure rolls back, and the result ends with it.
    s.clearLog();
    try h.expectResult(
        \\"mode":"transaction","statements":[{"text":"insert into t values (1)","simple":true},{"text":"select boom","simple":true},{"text":"select 1 as a","simple":true}]
    , "{\"results\":[{\"sets\":[{\"command\":\"OK\",\"rowCount\":1,\"rows\":[],\"ok\":{\"affectedRows\":1,\"insertId\":7,\"info\":\"\",\"serverStatus\":3,\"warningStatus\":0}}]}," ++ failure ++ "]}");
    try std.testing.expectEqualStrings("reset\nquery START TRANSACTION\nquery insert into t values (1)\nquery select boom\nquery ROLLBACK\n", s.logText());
    try std.testing.expectEqual(@as(u32, 1), s.logins);
    try std.testing.expect(!s.failed);
}

test "mysql fake: a marker only when the call committed nothing" {
    const h = try fakeHarness(.{ .max_result = 8 << 10 });
    defer h.destroy();
    const s = h.server.?;
    // A text that only reads changed nothing: the host can run the call again.
    try h.expectError("db", one("select shape"), "(limit: sql-type)");
    try h.expectError("db", one("select 1 as a; select big"), "larger than 8 KB (--sql-max-result-kb) (limit: sql-max-result)");
    try std.testing.expectEqual(@as(u64, 2), h.client.counters.to_host);
    // After an OK packet a command completed: a plain limit error, without a marker.
    const a = try h.call("db", one("insert into t values (1); select shape"));
    try std.testing.expect(!a.ok);
    try std.testing.expectEqualStrings("sql: a column has a type or a value without a native form (limit)", a.text);
    const b = try h.call("db", "\"mode\":\"independently\",\"statements\":[{\"text\":\"insert into t values (1)\",\"simple\":true},{\"text\":\"select big\",\"simple\":true},{\"text\":\"select 1 as a\",\"simple\":true}]");
    try std.testing.expect(!b.ok and std.mem.endsWith(u8, b.text, "(--sql-max-result-kb) (limit)"));
    // In a transaction the client rolls back, so the marker stays.
    s.clearLog();
    try h.expectError("db", "\"mode\":\"transaction\",\"statements\":[{\"text\":\"insert into t values (1)\",\"simple\":true},{\"text\":\"select shape\",\"simple\":true},{\"text\":\"select 1 as a\",\"simple\":true}]", "(limit: sql-type)");
    try std.testing.expectEqualStrings("reset\nquery START TRANSACTION\nquery insert into t values (1)\nquery select shape\nquery ROLLBACK\n", s.logText());
    // A command with an implicit commit ended the transaction: no marker, and no ROLLBACK.
    s.clearLog();
    const d = try h.call("db", "\"mode\":\"transaction\",\"statements\":[{\"text\":\"create table x (a int)\",\"simple\":true},{\"text\":\"select shape\",\"simple\":true}]");
    try std.testing.expect(!d.ok);
    try std.testing.expectEqualStrings("sql: a column has a type or a value without a native form (limit)", d.text);
    try std.testing.expectEqual(@as(u32, 0), s.count("query ROLLBACK"));
    // The connection is in order after each of these calls.
    try h.expectPart("db", one("select 1 as a"), "{\"a\":1}");
    try std.testing.expectEqual(@as(u32, 1), s.logins);
    try std.testing.expect(!s.failed);
}

test "mysql fake: a connection is made new for each call, or it closes" {
    const h = try fakeHarness(.{});
    defer h.destroy();
    const s = h.server.?;
    try h.expectPart("db", one("select 1 as a"), "{\"a\":1}");
    try h.expectPart("db", one("select 1 as a"), "{\"a\":1}");
    try std.testing.expectEqualStrings("login root\nquery select 1 as a\nreset\nquery select 1 as a\n", s.logText());
    try std.testing.expectEqual(@as(u64, 1), h.client.counters.reused);
    // A statement that changes the default database: the connection takes no other call.
    try h.expectPart("db", one("use other"), "\"serverStatus\":16386");
    try h.expectPart("db", one("select 1 as a"), "{\"a\":1}");
    try std.testing.expectEqual(@as(u32, 1), s.count("quit"));
    try std.testing.expectEqual(@as(u32, 2), s.logins);
    // A server without the reset command: each call has a connection of its own.
    s.no_reset = true;
    try h.expectPart("db", one("select 1 as a"), "{\"a\":1}");
    try h.expectPart("db", one("select 1 as a"), "{\"a\":1}");
    try std.testing.expectEqual(@as(u32, 4), s.logins);
    try h.settle();
    for (0..20) |_| h.turn();
    try std.testing.expectEqual(@as(u32, 0), s.sessions());
    try std.testing.expect(!s.failed);
}

test "mysql fake: calls over a limit wait in order or fail" {
    const h = try fakeHarness(.{ .pool_conns = 1, .max_reqs = 3 });
    defer h.destroy();
    const s = h.server.?;
    const args = "{\"credential\":\"db\",\"dialect\":\"mysql\"," ++ comptime one("select 1 as a") ++ "}";
    const first = try h.begin(args);
    const second = try h.begin(args);
    const third = try h.begin(args);
    // No call slot is free: the fourth call fails at once.
    try std.testing.expect(std.mem.indexOf(u8, h.client.start(7, 99, args, &h.store, sys.nowMs()).?, "--sql-max-requests") != null);
    var seq: u32 = 0;
    const order = [_]u32{ first, second, third };
    for (order) |want| {
        const a = try h.wait(&seq);
        try std.testing.expect(a.ok);
        try std.testing.expectEqual(want, seq);
    }
    // One connection served the three calls.
    try std.testing.expectEqual(@as(u32, 1), s.logins);
    try std.testing.expectEqual(@as(u64, 2), h.client.counters.waited);
    try std.testing.expectEqual(@as(u64, 1), h.client.counters.refused);
    // Bad arguments end a call before a connection opens.
    try h.expectError("db", "\"statements\":[{\"text\":\"select 1 as a\"}]", "simple: true");
    try h.expectError("db", "\"statements\":[{\"text\":\"select ?\",\"simple\":true,\"values\":[1]}]", "no bind values");
    try h.expectError("nope", one("select 1 as a"), "not in the credentials");
    try std.testing.expect(!s.failed);
}

test "mysql fake: a statement over its time limit is killed on a second connection" {
    const h = try fakeHarness(.{});
    defer h.destroy();
    const s = h.server.?;
    try h.expectError("db", "\"timeoutMs\":60," ++ comptime one("select hang"), "no result before the time limit of the call; the statement was cancelled");
    for (0..400) |_| {
        if (s.kills > 0) break;
        h.turn();
    }
    // The first session of the fake has the id 100.
    try std.testing.expectEqual(@as(u32, 1), s.count("kill 100"));
    try std.testing.expectEqual(@as(u32, 2), s.logins);
    try std.testing.expectEqual(@as(u64, 1), h.client.counters.kills);
    try h.settle();
    // A server that closes while a statement runs: the step fails.
    try h.expectError("db", one("select close"), "the connection to the database closed");
    try h.expectPart("db", one("select 1 as a"), "{\"a\":1}");
    try std.testing.expect(!s.failed);
}

// ---- a real server ------------------------------------------------------------------

const setup = "\"mode\":\"independently\",\"statements\":[{\"text\":\"create database if not exists zigmy\",\"simple\":true}," ++
    "{\"text\":\"drop table if exists zigmy.t\",\"simple\":true}," ++
    "{\"text\":\"create table zigmy.t (id int primary key auto_increment, v varchar(40), n int) engine=InnoDB\",\"simple\":true}]";

test "mysql live: every column type has the JSON of mysql2" {
    const t = target() orelse return error.SkipZigTest;
    const h = try Harness.create(t, .{});
    defer h.destroy();
    try h.expectResult(one("select 1 as a, -7 as b, 9007199254740991 as c, 9007199254740993 as d, -9223372036854775808 as e, 18446744073709551615 as f, true as g, null as h"),
        \\{"results":[{"sets":[{"rows":[{"a":1,"b":-7,"c":9007199254740991,"d":"9007199254740993","e":"-9223372036854775808","f":"18446744073709551615","g":1,"h":null}],"command":"SELECT","rowCount":1}]}]}
    );
    try h.expectResult("\"largeNumbers\":\"text\"," ++ comptime one("select 5 as a, cast(5 as signed) as b, count(*) as c from dual"),
        \\{"results":[{"sets":[{"rows":[{"a":"5","b":"5","c":"1"}],"command":"SELECT","rowCount":1}]}]}
    );
    try h.expectResult(one("select 1.5 as a, 10/3 as b, cast(1.5 as double) as c, 1e30 as d, cast(0.1 as float) as e, cast(-0.0 as double) as f, sum(2) as g"),
        \\{"results":[{"sets":[{"rows":[{"a":"1.5","b":"3.3333","c":1.5,"d":1e+30,"e":0.1,"f":0,"g":"2"}],"command":"SELECT","rowCount":1}]}]}
    );
    try h.expectResult("\"decimals\":\"numbers\"," ++ comptime one("select 1.50 as a, 10/3 as b, cast('0.30000000000000004' as decimal(20,17)) as c"),
        \\{"results":[{"sets":[{"rows":[{"a":1.5,"b":3.3333,"c":0.30000000000000004}],"command":"SELECT","rowCount":1}]}]}
    );
    try h.expectResult(one("select date '2024-02-29' as a, timestamp '2024-02-29 13:14:15.123456' as b, time '-838:59:59' as c, cast('2024-02-29 13:14:15' as datetime) as d, year('2024-01-01') as e"),
        \\{"results":[{"sets":[{"rows":[{"a":"2024-02-29","b":"2024-02-29 13:14:15.123456","c":"-838:59:59","d":"2024-02-29 13:14:15","e":2024}],"command":"SELECT","rowCount":1}]}]}
    );
    try h.expectResult(one("select 'a\\\"b\u{e9}' as a, 0x4142 as b, cast('ab' as binary(4)) as c, b'101010101' as d, cast('' as binary) as e, _utf8mb4'x,z' as f"),
        \\{"results":[{"sets":[{"rows":[{"a":"a\"bé","b":{"type":"Buffer","data":[65,66]},"c":{"type":"Buffer","data":[97,98,0,0]},"d":{"type":"Buffer","data":[1,85]},"e":{"type":"Buffer","data":[]},"f":"x,z"}],"command":"SELECT","rowCount":1}]}]}
    );
    try h.expectResult(one("select cast('{\\\"b\\\": [1, 2.50, 12345678901234567890, true, null], \\\"a\\\": \\\"x y\\\"}' as json) as j, json_array(1.0, 'q') as k"),
        \\{"results":[{"sets":[{"rows":[{"j":{"a":"x y","b":[1,2.5,"12345678901234567890",true,null]},"k":[1,"q"]}],"command":"SELECT","rowCount":1}]}]}
    );
    // Two columns of one name: the place of the first and the value of the last.
    try h.expectResult(one("select 1 as a, 'x' as b, 2 as a"),
        \\{"results":[{"sets":[{"rows":[{"a":2,"b":"x"}],"command":"SELECT","rowCount":1}]}]}
    );
    try h.expectError("db", one("select st_geomfromtext('POINT(1 2)') as g"), "(limit: sql-type)");
    try h.expectError("db", "\"dates\":\"legacy\"," ++ comptime one("select now() as d"), "(limit: sql-type)");
}

test "mysql live: OK packets, errors and the three modes" {
    const t = target() orelse return error.SkipZigTest;
    const h = try Harness.create(t, .{});
    defer h.destroy();
    try h.expectPart("db", setup, "\"command\":\"OK\"");
    try h.expectResult(one("insert into zigmy.t (v, n) values ('a', 1), ('b', 2)"),
        \\{"results":[{"sets":[{"command":"OK","rowCount":2,"rows":[],"ok":{"affectedRows":2,"insertId":1,"info":"Records: 2  Duplicates: 0  Warnings: 0","serverStatus":2,"warningStatus":0}}]}]}
    );
    // CLIENT_FOUND_ROWS: the count of an UPDATE is the rows that match.
    try h.expectResult(one("update zigmy.t set n = 1 where id = 1"),
        \\{"results":[{"sets":[{"command":"OK","rowCount":1,"rows":[],"ok":{"affectedRows":1,"insertId":0,"info":"Rows matched: 1  Changed: 0  Warnings: 0","serverStatus":2,"warningStatus":0}}]}]}
    );
    try h.expectResult(one("select id, v from zigmy.t order by id; delete from zigmy.t where id = 2; select count(*) as n from zigmy.t"),
        \\{"results":[{"sets":[{"rows":[{"id":1,"v":"a"},{"id":2,"v":"b"}],"command":"SELECT","rowCount":2},{"command":"OK","rowCount":1,"rows":[],"ok":{"affectedRows":1,"insertId":0,"info":"","serverStatus":10,"warningStatus":0}},{"rows":[{"n":1}],"command":"SELECT","rowCount":1}]}]}
    );
    try h.expectResult(one("insert into zigmy.t (id, v) values (1, 'dup')"),
        \\{"results":[{"error":{"message":"Duplicate entry '1' for key 't.PRIMARY'","code":"ER_DUP_ENTRY","errno":1062,"sqlState":"23000","sqlMessage":"Duplicate entry '1' for key 't.PRIMARY'"}}]}
    );
    try h.expectPart("db", one("insert into zigmy.t (v) values ('kept'); SELEC 2"), "{\"results\":[{\"error\":{\"message\":\"You have an error in your SQL syntax;");
    try h.expectPart("db", one(""), "\"code\":\"ER_EMPTY_QUERY\",\"errno\":1065,\"sqlState\":\"42000\",\"sqlMessage\":\"Query was empty\"");
    try h.expectPart("db", one("select * from zigmy.nope"), "\"code\":\"ER_NO_SUCH_TABLE\",\"errno\":1146,\"sqlState\":\"42S02\"");
    // The command before the failure stays committed, as in v1.
    try h.expectPart("db", one("select count(*) as n from zigmy.t where v = 'kept'"), "{\"n\":1}");
    // A transaction: the first failure rolls back.
    try h.expectPart("db", "\"mode\":\"transaction\",\"statements\":[{\"text\":\"insert into zigmy.t (v) values ('tx')\",\"simple\":true},{\"text\":\"insert into zigmy.t (id) values (1)\",\"simple\":true},{\"text\":\"select 1\",\"simple\":true}]", "\"serverStatus\":3,\"warningStatus\":0}}]},{\"error\":{\"message\":\"Duplicate entry");
    try h.expectPart("db", one("select count(*) as n from zigmy.t where v = 'tx'"), "{\"n\":0}");
    try h.expectPart("db", "\"mode\":\"transaction\",\"statements\":[{\"text\":\"insert into zigmy.t (v) values ('tx')\",\"simple\":true},{\"text\":\"select count(*) as n from zigmy.t where v = 'tx'\",\"simple\":true}]", "{\"n\":1}");
    try h.expectPart("db", one("select count(*) as n from zigmy.t where v = 'tx'"), "{\"n\":1}");
    // A group stops at its failure; the other group runs.
    try h.expectPart("db", "\"mode\":\"independently\",\"statements\":[{\"text\":\"select * from zigmy.nope\",\"simple\":true,\"group\":0},{\"text\":\"select 1 as a\",\"simple\":true,\"group\":0},{\"text\":\"select 2 as a\",\"simple\":true,\"group\":1}]", "\"sqlMessage\":\"Table 'zigmy.nope' doesn't exist\"}},{\"skipped\":true},{\"sets\":[{\"rows\":[{\"a\":2}]");
    // The session state goes from one statement of a call to the next, and not to the next call.
    try h.expectPart("db", "\"mode\":\"independently\",\"statements\":[{\"text\":\"set @x = 5\",\"simple\":true},{\"text\":\"select @x as x, @@character_set_results as c, @@collation_connection as k\",\"simple\":true}]", "{\"x\":5,\"c\":\"utf8mb4\",\"k\":\"utf8mb4_unicode_ci\"}");
    try h.expectPart("db", one("select @x as x, @@character_set_results as c, @@collation_connection as k, '\u{e9}' as s"), "{\"x\":null,\"c\":\"utf8mb4\",\"k\":\"utf8mb4_unicode_ci\",\"s\":\"é\"}");
    try std.testing.expectEqual(@as(u64, 1), h.client.counters.connects);
    // `USE` changes the session: the status says so, and the next call has a new connection.
    try h.expectPart("db", one("use zigmy"), "\"serverStatus\":16386");
    try h.expectPart("db", one("select database() as d"), "{\"d\":\"card\"}");
    try std.testing.expectEqual(@as(u64, 2), h.client.counters.connects);
}

test "mysql live: a marker only when the call committed nothing" {
    const t = target() orelse return error.SkipZigTest;
    const h = try Harness.create(t, .{ .max_result = 16 << 10 });
    defer h.destroy();
    try h.expectPart("db", setup, "\"command\":\"OK\"");
    try h.expectError("db", one("select repeat('x', 20000) as s"), "(limit: sql-max-result)");
    try h.expectError("db", one("select repeat('x', 200000) as s"), "(limit: sql-max-result)");
    const a = try h.call("db", one("insert into zigmy.t (v) values ('m'); select repeat('x', 20000) as s"));
    try std.testing.expect(!a.ok and std.mem.endsWith(u8, a.text, "(--sql-max-result-kb) (limit)"));
    try h.expectPart("db", one("select count(*) as n from zigmy.t where v = 'm'"), "{\"n\":1}");
    // In a transaction the insert is rolled back, and the marker stays.
    try h.expectError("db", "\"mode\":\"transaction\",\"statements\":[{\"text\":\"insert into zigmy.t (v) values ('r')\",\"simple\":true},{\"text\":\"select st_geomfromtext('POINT(1 2)') as g\",\"simple\":true}]", "(limit: sql-type)");
    try h.expectPart("db", one("select count(*) as n from zigmy.t where v = 'r'"), "{\"n\":0}");
    // A DDL command commits by itself: the client cannot roll back, so no marker.
    const b = try h.call("db", "\"mode\":\"transaction\",\"statements\":[{\"text\":\"insert into zigmy.t (v) values ('d')\",\"simple\":true},{\"text\":\"create table if not exists zigmy.u (a int)\",\"simple\":true},{\"text\":\"select st_geomfromtext('POINT(1 2)') as g\",\"simple\":true}]");
    try std.testing.expect(!b.ok);
    try std.testing.expectEqualStrings("sql: a column has a type or a value without a native form (limit)", b.text);
    try h.expectPart("db", one("select count(*) as n from zigmy.t where v = 'd'"), "{\"n\":1}");
}

test "mysql live: logins, connect errors and the time limit" {
    const t = target() orelse return error.SkipZigTest;
    const h = try Harness.create(t, .{});
    defer h.destroy();
    try h.expectPart("nat", one("select current_user() as u"), "{\"u\":\"nat@");
    try h.expectPart("nopw", one("select current_user() as u"), "{\"u\":\"nopw@");
    // An empty cache: the full login, with the password under the RSA key of the server.
    try h.expectPart("db", one("flush privileges"), "\"command\":\"OK\"");
    try h.expectPart("sha", one("select current_user() as u"), "{\"u\":\"sha@");
    try h.settle();
    // The password is in the cache now: the fast login.
    try h.expectPart("sha", one("select current_user() as u"), "{\"u\":\"sha@");
    try h.expectPart("wrong", one("select 1"), "\"code\":\"ER_ACCESS_DENIED_ERROR\",\"errno\":1045,\"sqlState\":\"28000\"");
    try h.expectPart("nodb", one("select 1"), "{\"results\":[],\"connect\":{\"message\":\"Unknown database 'wfrt_no_such_db'\",\"code\":\"ER_BAD_DB_ERROR\",\"errno\":1049,\"sqlState\":\"42000\",\"sqlMessage\":\"Unknown database 'wfrt_no_such_db'\"}}");
    try h.expectPart("refused", one("select 1"), "\"connect\":{\"message\":\"connect ECONNREFUSED 127.0.0.1:1\",\"code\":\"ECONNREFUSED\"}");
    try h.expectPart("nohost", one("select 1"), "\"connect\":{\"message\":\"getaddrinfo ENOTFOUND wfrt-no-such-host.invalid\",\"code\":\"ENOTFOUND\"}");
    // The certificate of the test server is self-signed: verification fails, as it must.
    try h.expectError("tls", one("select 1"), "(limit: sql-credential)");
    // The statement is killed on the server, not only left alone.
    try h.expectError("db", "\"timeoutMs\":300," ++ comptime one("select sleep(7.77) as s"), "the statement was cancelled");
    for (0..100) |_| h.turn();
    try std.testing.expectEqual(@as(u64, 1), h.client.counters.kills);
    try h.expectPart("db", one("select count(*) as n from information_schema.processlist where info like 'select sleep(7.77)%'"), "{\"n\":0}");
}
