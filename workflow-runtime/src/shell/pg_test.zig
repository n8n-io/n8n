//! Tests of the PostgreSQL client against a real server. They run when
//! `WFRT_TEST_PG` names one (`host:port`, user `postgres`, password in
//! `WFRT_TEST_PG_PASSWORD`, database `postgres`), and are skipped without
//! it. docs/sql-effect.md says how to start the server that they expect.
const std = @import("std");
const sys = @import("sys.zig");
const creds = @import("creds.zig");
const pg = @import("pg.zig");

const kind_conn: u8 = 13;
const kind_dns: u8 = 14;

const Target = struct { host: []const u8, port: []const u8, password: []const u8 };

fn target() ?Target {
    const hp = sys.getenv("WFRT_TEST_PG") orelse return null;
    const colon = std.mem.lastIndexOfScalar(u8, hp, ':') orelse return null;
    return .{ .host = hp[0..colon], .port = hp[colon + 1 ..], .password = sys.getenv("WFRT_TEST_PG_PASSWORD") orelse "" };
}

const Answer = struct { ok: bool, text: []const u8 };

const Harness = struct {
    arena: std.heap.ArenaAllocator,
    poller: sys.Poller,
    client: *pg.Client,
    store: creds.Store,
    next_seq: u32 = 1,

    /// The slots: `db` (the test server), and slots that differ in one value.
    fn init(h: *Harness, t: Target, cfg: pg.Config) !void {
        h.arena = std.heap.ArenaAllocator.init(std.testing.allocator);
        const a = h.arena.allocator();
        h.poller = try sys.Poller.init();
        const doc = try std.fmt.allocPrint(a,
            \\{{"db":{{"type":"postgres","data":{{"host":"{0s}","port":{1s},"user":"postgres","password":"{2s}","database":"postgres","ssl":"disable","maxConnections":100}}}},
            \\"wrong":{{"data":{{"host":"{0s}","port":{1s},"user":"postgres","password":"not-the-password","database":"postgres"}}}},
            \\"nodb":{{"data":{{"host":"{0s}","port":{1s},"user":"postgres","password":"{2s}","database":"wfrt_no_such_db"}}}},
            \\"md5":{{"data":{{"host":"{0s}","port":{1s},"user":"wfrt_md5","password":"md5-secret","database":"postgres"}}}},
            \\"clear":{{"data":{{"host":"{0s}","port":{1s},"user":"wfrt_clear","password":"clear-secret","database":"postgres"}}}},
            \\"tls":{{"data":{{"host":"{0s}","port":{1s},"user":"postgres","password":"{2s}","database":"postgres","ssl":"require","allowUnauthorizedCerts":true}}}},
            \\"tlsverify":{{"data":{{"host":"{0s}","port":{1s},"user":"postgres","password":"{2s}","database":"postgres","ssl":"require"}}}},
            \\"refused":{{"data":{{"host":"127.0.0.1","port":1,"user":"u","password":"p","database":"d"}}}},
            \\"nohost":{{"data":{{"host":"wfrt-no-such-host.invalid","port":5432,"user":"u","password":"p","database":"d"}}}},
            \\"ssh":{{"data":{{"host":"{0s}","port":{1s},"user":"postgres","password":"{2s}","database":"postgres","sshTunnel":true}}}}}}
        , .{ t.host, t.port, t.password });
        h.store = try creds.Store.parse(a, doc);
        h.client = try a.create(pg.Client);
        try h.client.init(a, cfg, &h.poller, kind_conn, kind_dns);
    }

    fn deinit(h: *Harness) void {
        h.client.deinit();
        h.poller.deinit();
        h.arena.deinit();
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

    /// Run the event loop until one call ends; give its seq and its answer.
    fn wait(h: *Harness, seq_out: *u32) !Answer {
        var ready: [64]sys.Ready = undefined;
        for (0..4000) |_| {
            if (h.client.nextDone()) |d| {
                const text = try h.arena.allocator().dupe(u8, d.payload);
                seq_out.* = d.seq;
                h.client.release(d.req);
                return .{ .ok = d.ok, .text = text };
            }
            const n = h.poller.wait(&ready, 5);
            for (ready[0..n]) |ev| {
                const idx: u32 = @truncate(ev.token);
                const gen: u32 = @truncate((ev.token >> 32) & 0xFFFFFF);
                if (ev.token >> 56 == kind_conn) h.client.onConn(idx, gen, ev, sys.nowMs()) else h.client.onDns(@intCast(idx), ev);
            }
            h.client.afterEvents(sys.nowMs());
        }
        return error.NoAnswer;
    }

    fn call(h: *Harness, comptime slot: []const u8, comptime rest: []const u8) !Answer {
        var seq: u32 = 0;
        _ = try h.begin("{\"credential\":\"" ++ slot ++ "\",\"dialect\":\"postgres\"," ++ rest ++ "}");
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

const reset = "\"mode\":\"independently\",\"statements\":[{\"text\":\"create table if not exists wfrt_pg_t (id int primary key, v text)\"},{\"text\":\"truncate wfrt_pg_t\"}]";
const count = "\"statements\":[{\"text\":\"select count(*)::int4 as n from wfrt_pg_t\"}]";

test "pg live: values go as binds and every column type has the JSON of node-postgres" {
    const t = target() orelse return error.SkipZigTest;
    var h: Harness = undefined;
    try h.init(t, .{});
    defer h.deinit();
    try h.expectResult(
        \\"statements":[{"text":"select $1::int4 + 1 as a, $2 as t, $3 as n, $4 as big, $5 as b, $6::text as z","values":[7,"x'y; drop table x --",1.5,3000000000,true,null]}]
    ,
        \\{"results":[{"rows":[{"a":8,"t":"x'y; drop table x --","n":"1.5","big":"3000000000","b":true,"z":null}],"command":"SELECT","rowCount":1}]}
    );
    try h.expectResult(
        \\"largeNumbers":"numbers","statements":[{"text":"select 9007199254740993::int8 as big, 1.50::numeric as n, 'NaN'::numeric as nan, 1e20::float8 as f, 'Infinity'::float8 as inf, 2::int2 as s, 0.1::float4 as r"}]
    ,
        \\{"results":[{"rows":[{"big":9007199254740992,"n":1.5,"nan":null,"f":100000000000000000000,"inf":null,"s":2,"r":0.1}],"command":"SELECT","rowCount":1}]}
    );
    try h.expectResult(
        \\"statements":[{"text":"select '{\"k\": [1, \"a\"]}'::jsonb as j, '[1]'::json as j2, '\\x00ff10'::bytea as by, '2024-01-02 03:04:05.123456+00'::timestamptz as ts, '2024-01-02'::date as d, 'infinity'::timestamptz as inf, 'c81d4e2e-bcf2-11e6-869b-7df92533d2db'::uuid as u, '12:00'::time as tm"}]
    ,
        \\{"results":[{"rows":[{"j":{"k": [1, "a"]},"j2":[1],"by":{"type":"Buffer","data":[0,255,16]},"ts":"2024-01-02T03:04:05.123Z","d":"2024-01-02","inf":"infinity","u":"c81d4e2e-bcf2-11e6-869b-7df92533d2db","tm":"12:00:00"}],"command":"SELECT","rowCount":1}]}
    );
    // The same statement again uses the prepared statement of the connection.
    const before = h.client.counters.prepared;
    const again = "\"statements\":[{\"text\":\"select 42 as x\"}]";
    for (0..3) |_| try h.expectResult(again, "{\"results\":[{\"rows\":[{\"x\":42}],\"command\":\"SELECT\",\"rowCount\":1}]}");
    try std.testing.expectEqual(before + 1, h.client.counters.prepared);
    try std.testing.expectEqual(@as(u64, 1), h.client.counters.connects);
}

test "pg live: the three modes commit and roll back as the v1 node does" {
    const t = target() orelse return error.SkipZigTest;
    var h: Harness = undefined;
    try h.init(t, .{});
    defer h.deinit();
    try h.expectPart("db", reset, "\"command\":\"TRUNCATE\"");
    // transaction: the second insert fails, and the first is rolled back.
    const tx =
        \\"mode":"transaction","statements":[{"text":"insert into wfrt_pg_t values ($1, $2)","values":[1,"a"]},{"text":"insert into wfrt_pg_t values ($1, $2)","values":[1,"b"]},{"text":"insert into wfrt_pg_t values ($1, $2)","values":[2,"c"]}]
    ;
    try h.expectPart("db", tx, "{\"results\":[{\"rows\":[],\"command\":\"INSERT\",\"rowCount\":1},{\"error\":{\"length\":");
    try h.expectPart("db", tx, "\"severity\":\"ERROR\",\"code\":\"23505\",\"message\":\"duplicate key value violates unique constraint \\\"wfrt_pg_t_pkey\\\"\",\"detail\":\"Key (id)=(1) already exists.\",\"schema\":\"public\",\"table\":\"wfrt_pg_t\",\"constraint\":\"wfrt_pg_t_pkey\",\"file\":");
    try h.expectPart("db", tx, "\"routine\":\"_bt_check_unique\"}}]}");
    try h.expectResult(count, "{\"results\":[{\"rows\":[{\"n\":0}],\"command\":\"SELECT\",\"rowCount\":1}]}");
    // independently: the failure is recorded and the next statement runs.
    try h.expectPart("db",
        \\"mode":"independently","statements":[{"text":"insert into wfrt_pg_t values ($1, $2)","values":[1,"a"]},{"text":"insert into wfrt_pg_t values ($1, $2)","values":[1,"b"]},{"text":"insert into wfrt_pg_t values ($1, $2) returning id, v","values":[2,"c"]}]
    , "\"code\":\"23505\"");
    try h.expectResult(count, "{\"results\":[{\"rows\":[{\"n\":2}],\"command\":\"SELECT\",\"rowCount\":1}]}");
    // single with two statements is one transaction.
    try h.expectPart("db",
        \\"statements":[{"text":"insert into wfrt_pg_t values ($1, $2)","values":[3,"a"]},{"text":"insert into wfrt_pg_t values ($1, $2)","values":[3,"b"]}]
    , "\"code\":\"23505\"");
    try h.expectResult(count, "{\"results\":[{\"rows\":[{\"n\":2}],\"command\":\"SELECT\",\"rowCount\":1}]}");
    try h.expectResult(
        \\"statements":[{"text":"update wfrt_pg_t set v = $1 where id = $2 returning v","values":["z",2]},{"text":"delete from wfrt_pg_t where id = $1","values":[1]}]
    ,
        \\{"results":[{"rows":[{"v":"z"}],"command":"UPDATE","rowCount":1},{"rows":[],"command":"DELETE","rowCount":1}]}
    );
    // A statement whose table a statement before it makes is parsed where it runs.
    try h.expectPart("db",
        \\"statements":[{"text":"create table wfrt_pg_late (x int)"},{"text":"insert into wfrt_pg_late values ($1) returning x","values":[5]},{"text":"drop table wfrt_pg_late"}]
    , "{\"rows\":[{\"x\":5}],\"command\":\"INSERT\",\"rowCount\":1}");
    // A syntax error is the error of its statement.
    try h.expectPart("db", "\"statements\":[{\"text\":\"selec 1\"}]", "\"message\":\"syntax error at or near \\\"selec\\\"\",\"position\":\"1\"");
}

test "pg live: a call without an exact native form ends with a marker and commits nothing" {
    const t = target() orelse return error.SkipZigTest;
    var h: Harness = undefined;
    try h.init(t, .{ .max_result = 2048 });
    defer h.deinit();
    try h.expectPart("db", reset, "\"command\":\"TRUNCATE\"");
    try h.expectError("db", "\"statements\":[{\"text\":\"insert into wfrt_pg_t values (1, 'a'); select 1\"}]", "(limit: sql-statement)");
    try h.expectError("db", "\"statements\":[{\"text\":\"insert into wfrt_pg_t values (1, 'a') returning array[id]\"}]", "(limit: sql-type)");
    // The v1 node writes the value into the text; as a bind these have no form.
    try h.expectError("db", "\"statements\":[{\"text\":\"select $1 is null as a\",\"values\":[null]},{\"text\":\"insert into wfrt_pg_t values (1, 'a')\"}]", "(limit: sql-statement)");
    try h.expectError("db", "\"statements\":[{\"text\":\"select * from wfrt_pg_t order by id limit 1 offset $2\",\"values\":[1]}]", "(limit: sql-statement)");
    try h.expectError("db", "\"statements\":[{\"text\":\"select 1 as $1\",\"values\":[\"x\"]}]", "(limit: sql-statement)");
    try h.expectError("db", "\"statements\":[{\"text\":\"insert into wfrt_pg_t values (1, 'a') returning now()::timestamp\"}]", "(limit: sql-type)");
    try h.expectError("db", "\"dates\":\"legacy\",\"statements\":[{\"text\":\"select current_date as d\"}]", "(limit: sql-type)");
    try h.expectError("db", "\"statements\":[{\"text\":\"select 1 as a, 2 as a\"}]", "(limit: sql-type)");
    // The result is over the limit: the insert is rolled back.
    try h.expectError("db", "\"statements\":[{\"text\":\"insert into wfrt_pg_t values (1, 'a') returning repeat('x', 5000) as big\"}]", "(limit: sql-max-result)");
    try h.expectError("db", "\"statements\":[{\"text\":\"select repeat('x', 5000) as big\"}]", "(limit: sql-max-result)");
    // A value without a native form shows only in the row: the statement is rolled back.
    try h.expectError("db", "\"statements\":[{\"text\":\"insert into wfrt_pg_t values (1, 'a') returning '0099-01-01 00:00:00+00'::timestamptz as old\"}]", "(limit: sql-type)");
    try h.expectError("ssh", count, "(limit: sql-credential)");
    try h.expectResult(count, "{\"results\":[{\"rows\":[{\"n\":0}],\"command\":\"SELECT\",\"rowCount\":1}]}");
    // After a committed statement the call cannot run again: no marker.
    const a = try h.call("db", "\"mode\":\"independently\",\"statements\":[{\"text\":\"insert into wfrt_pg_t values (1, 'a')\"},{\"text\":\"select repeat('x', 5000) as big\"}]");
    try std.testing.expect(!a.ok);
    try std.testing.expect(std.mem.indexOf(u8, a.text, "(limit: sql-") == null);
    try std.testing.expect(std.mem.endsWith(u8, a.text, "(limit)"));
    // Bad arguments are refused before a connection is used.
    try h.expectError("db", "\"statements\":[{\"text\":\"select $1\",\"values\":[[1,2]]}]", "a bind value must be");
    try h.expectError("nope", count, "is not in the credentials");
}

test "pg live: login methods and connect errors" {
    const t = target() orelse return error.SkipZigTest;
    var h: Harness = undefined;
    try h.init(t, .{});
    defer h.deinit();
    try h.expectPart("wrong", count, "{\"results\":[],\"connect\":{\"length\":");
    try h.expectPart("wrong", count, "\"code\":\"28P01\",\"message\":\"password authentication failed for user \\\"postgres\\\"\"");
    try h.expectPart("nodb", count, "\"code\":\"3D000\",\"message\":\"database \\\"wfrt_no_such_db\\\" does not exist\"");
    try h.expectResult("\"statements\":[{\"text\":\"select 1 as one\"}]", "{\"results\":[{\"rows\":[{\"one\":1}],\"command\":\"SELECT\",\"rowCount\":1}]}");
    try h.expectPart("refused", count, "{\"results\":[],\"connect\":{\"message\":\"connect ECONNREFUSED 127.0.0.1:1\",\"code\":\"ECONNREFUSED\"}}");
    try h.expectPart("nohost", count, "{\"results\":[],\"connect\":{\"message\":\"getaddrinfo ENOTFOUND wfrt-no-such-host.invalid\",\"code\":\"ENOTFOUND\"}}");
    if (sys.getenv("WFRT_TEST_PG_AUTH") != null) {
        try h.expectPart("md5", "\"statements\":[{\"text\":\"select current_user as u\"}]", "{\"u\":\"wfrt_md5\"}");
        try h.expectPart("clear", "\"statements\":[{\"text\":\"select current_user as u\"}]", "{\"u\":\"wfrt_clear\"}");
    }
    if (sys.getenv("WFRT_TEST_PG_TLS") != null) {
        try h.expectPart("tls", "\"statements\":[{\"text\":\"select ssl from pg_stat_ssl where pid = pg_backend_pid()\"}]", "{\"ssl\":true}");
        try h.expectPart("tlsverify", count, "\"connect\":{\"message\":\"sql: TLS failed: certificate verify failed");
    } else {
        try h.expectPart("tls", count, "{\"results\":[],\"connect\":{\"message\":\"The server does not support SSL connections\"}}");
    }
}

test "pg live: a pool has a fixed size, calls wait in order, and a slow statement is cancelled" {
    const t = target() orelse return error.SkipZigTest;
    var h: Harness = undefined;
    try h.init(t, .{ .max_reqs = 3, .pool_conns = 1 });
    defer h.deinit();
    const slow = "{\"credential\":\"db\",\"dialect\":\"postgres\",\"statements\":[{\"text\":\"select pg_sleep(0.05)::text as s, $1::int4 as i\",\"values\":[%]}]}";
    var seqs: [3]u32 = @splat(0);
    inline for (0..3) |i| seqs[i] = try h.begin(slow[0 .. slow.len - 5] ++ std.fmt.comptimePrint("{d}", .{i}) ++ "]}]}");
    // The fourth call has no slot: it is refused at once.
    try std.testing.expect(h.client.start(7, 99, "{}", &h.store, sys.nowMs()) != null);
    for (0..3) |i| {
        var seq: u32 = 0;
        const a = try h.wait(&seq);
        try std.testing.expect(a.ok);
        // One connection: the calls end in the order in which they came.
        try std.testing.expectEqual(seqs[i], seq);
    }
    try std.testing.expectEqual(@as(u64, 1), h.client.counters.connects);
    try std.testing.expectEqual(@as(u64, 2), h.client.counters.waited);
    try std.testing.expectEqual(@as(u64, 1), h.client.counters.refused);
    // The time limit ends the call; the cancel ends the statement on the server.
    try h.expectError("db", "\"timeoutMs\":150,\"statements\":[{\"text\":\"select pg_sleep(30)\"}]", "the statement was cancelled");
    var gone = false;
    for (0..40) |_| {
        const a = try h.call("db", "\"statements\":[{\"text\":\"select count(*)::int4 as n from pg_stat_activity where query like 'select pg_sleep(30)%' and state = 'active'\"}]");
        try std.testing.expect(a.ok);
        gone = std.mem.indexOf(u8, a.text, "{\"n\":0}") != null;
        if (gone) break;
    }
    try std.testing.expect(gone);
    try std.testing.expectEqual(@as(u64, 2), h.client.counters.connects);
}
