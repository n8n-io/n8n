//! Tests of the PostgreSQL client. The `pg fake` tests run against the
//! scripted server of `pg_fake.zig`, in the thread of the test, without a
//! database. The `pg live` tests run against a real server when
//! `WFRT_TEST_PG` names one (`host:port`, user `postgres`, password in
//! `WFRT_TEST_PG_PASSWORD`, database `postgres`), and are skipped without
//! it. docs/sql-effect.md says how to start the server that they expect.
const std = @import("std");
const sys = @import("sys.zig");
const creds = @import("creds.zig");
const pg = @import("pg.zig");
const fake = @import("pg_fake.zig");

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
    /// The harness lives in its own arena: `destroy` frees all of it.
    fn create(t: Target, cfg: pg.Config) !*Harness {
        var arena = std.heap.ArenaAllocator.init(std.testing.allocator);
        errdefer arena.deinit();
        const a = arena.allocator();
        const h = try a.create(Harness);
        h.* = .{ .arena = arena, .poller = try sys.Poller.init(), .client = try a.create(pg.Client), .store = try creds.Store.parse(a, "{}") };
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
        try h.client.init(a, cfg, &h.poller, kind_conn, kind_dns);
        // The arena as it is after the last allocation above.
        h.arena = arena;
        return h;
    }

    fn destroy(h: *Harness) void {
        h.client.deinit();
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

    /// Run the event loop until one call ends; give its seq and its answer.
    fn wait(h: *Harness, seq_out: *u32) !Answer {
        var ready: [64]sys.Ready = @splat(.{ .token = 0, .readable = false, .writable = false, .eof = false });
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
    const h = try Harness.create(t, .{});
    defer h.destroy();
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

test "pg live: arrays, interval, point and circle have the JSON of node-postgres" {
    const t = target() orelse return error.SkipZigTest;
    const h = try Harness.create(t, .{});
    defer h.destroy();
    // Each result was checked with pg-promise and the type parsers of the v1 node (version 2.7).
    // int8[] stays text and numeric[] is a number, also with `largeNumbers: numbers`.
    try h.expectResult(
        \\"largeNumbers":"numbers","statements":[{"text":"select array[1,null,3]::int2[] as i2, array[9007199254740993,null,-5]::int8[] as i8, array[1.5,'NaN','Infinity',null]::float8[] as f8, array[1.50,null,'NaN',12345678901234567890.123]::numeric[] as n, array[true,false,null] as b, '{{1,2},{3,4}}'::int4[] as nested, '[0:2]={7,8,9}'::int4[] as dims, '{}'::text[] as e, 1.50::numeric as sn"}]
    ,
        \\{"results":[{"rows":[{"i2":[1,null,3],"i8":["9007199254740993",null,"-5"],"f8":[1.5,null,null,null],"n":[1.5,null,null,12345678901234567000],"b":[true,false,null],"nested":[[1,2],[3,4]],"dims":[7,8,9],"e":[],"sn":1.5}],"command":"SELECT","rowCount":1}]}
    );
    try h.expectResult(
        \\"statements":[{"text":"select array['a',null,'NULL','null','','a b','q\"uote','back\\slash','{x}','a,b']::text[] as t, array['c']::char(3)[] as c, array['c81d4e2e-bcf2-11e6-869b-7df92533d2db',null]::uuid[] as u, '{{{a,b}},{{c,NULL}}}'::text[] as n3, array['v',null]::varchar[] as v, array[1.50]::numeric[] as n"}]
    ,
        \\{"results":[{"rows":[{"t":["a",null,"NULL","null","","a b","q\"uote","back\\slash","{x}","a,b"],"c":["c  "],"u":["c81d4e2e-bcf2-11e6-869b-7df92533d2db",null],"n3":[[["a","b"]],[["c",null]]],"v":["v",null],"n":[1.5]}],"command":"SELECT","rowCount":1}]}
    );
    try h.expectResult(
        \\"statements":[{"text":"select array['{\"k\": [1, \"a\"]}', null, 'null', '1', '\"s\"']::jsonb[] as jb, array['{\"k\":  1}', 'null']::json[] as j, array['2024-01-02', null, 'infinity']::date[] as d, array['2024-01-02 03:04:05.123456+00', null, 'infinity', '2024-06-01 00:00:00+05:30']::timestamptz[] as tz"}]
    ,
        \\{"results":[{"rows":[{"jb":[{"k": [1, "a"]},null,null,1,"s"],"j":[{"k":  1},null],"d":["2024-01-02",null,"infinity"],"tz":["2024-01-02T03:04:05.123Z",null,"infinity","2024-05-31T18:30:00.000Z"]}],"command":"SELECT","rowCount":1}]}
    );
    try h.expectResult(
        \\"statements":[{"text":"select '1 year 2 mons 3 days 04:05:06.789'::interval as a, '00:00:00'::interval as z, '-1 year -2 mons +3 days -04:05:06'::interval as neg, '-00:00:01.5'::interval as ms, '100:00:00.000001'::interval as h, array['1 day 02:00:00', null, '00:00:00']::interval[] as arr, null::interval as nul"}]
    ,
        \\{"results":[{"rows":[{"a":{"years":1,"months":2,"days":3,"hours":4,"minutes":5,"seconds":6,"milliseconds":789},"z":{},"neg":{"years":-1,"months":-2,"days":3,"hours":-4,"minutes":-5,"seconds":-6},"ms":{"seconds":-1,"milliseconds":-500},"h":{"hours":100,"milliseconds":0.001},"arr":[{"days":1,"hours":2},null,{}],"nul":null}],"command":"SELECT","rowCount":1}]}
    );
    try h.expectResult(
        \\"statements":[{"text":"select '(1.5,-2)'::point as p, '(NaN,Infinity)'::point as pn, '(1e20,1e-7)'::point as pe, '<(1,2),3>'::circle as c, '<(1e20,-1e-7),Infinity>'::circle as ci, array['(1,2)',null]::point[] as pa, null::point as np, array['<(1,2),3>']::circle[] as ca, array['-0'::float8, 1e300] as fz, array[26]::oid[] as o"}]
    ,
        \\{"results":[{"rows":[{"p":{"x":1.5,"y":-2},"pn":{"x":null,"y":null},"pe":{"x":100000000000000000000,"y":1e-7},"c":{"x":1,"y":2,"radius":3},"ci":{"x":100000000000000000000,"y":-1e-7,"radius":null},"pa":[{"x":1,"y":2},null],"np":null,"ca":"{\"<(1,2),3>\"}","fz":[0,1e+300],"o":[26]}],"command":"SELECT","rowCount":1}]}
    );
    // The types that stay without a native form.
    try h.expectError("db", "\"statements\":[{\"text\":\"select array['\\\\\\\\x00ff'::bytea] as b\"}]", "(limit: sql-type)");
    try h.expectError("db", "\"statements\":[{\"text\":\"select array[now()::timestamp] as t\"}]", "(limit: sql-type)");
    try h.expectError("db", "\"dates\":\"legacy\",\"statements\":[{\"text\":\"select array[now()] as t\"}]", "(limit: sql-type)");
    // An interval in another style of the session has no native form; the marker comes before the statement runs.
    try h.expectPart("db", "\"statements\":[{\"text\":\"set intervalstyle = 'iso_8601'\"}]", "\"command\":\"SET\"");
    try h.expectError("db", "\"statements\":[{\"text\":\"select '1 day'::interval as i\"}]", "(limit: sql-type)");
    try h.expectError("db", "\"statements\":[{\"text\":\"select array['1 day'::interval] as i\"}]", "(limit: sql-type)");
    try h.expectPart("db", "\"statements\":[{\"text\":\"set intervalstyle = 'postgres'\"}]", "\"command\":\"SET\"");
    try h.expectPart("db", "\"statements\":[{\"text\":\"select '1 day'::interval as i\"}]", "{\"i\":{\"days\":1}}");
    // The escape format of bytea, checked with postgres-bytea 1.0.0.
    try h.expectPart("db", "\"statements\":[{\"text\":\"set bytea_output = 'escape'\"}]", "\"command\":\"SET\"");
    try h.expectPart("db", "\"statements\":[{\"text\":\"select '\\\\x00ff5c41207e7f80'::bytea as b, ''::bytea as e\"}]", "{\"b\":{\"type\":\"Buffer\",\"data\":[0,255,92,65,32,126,127,128]},\"e\":{\"type\":\"Buffer\",\"data\":[]}}");
    try h.expectPart("db", "\"statements\":[{\"text\":\"set bytea_output = 'hex'\"}]", "\"command\":\"SET\"");
    try std.testing.expectEqual(@as(u64, 1), h.client.counters.connects);
}

test "pg live: the three modes commit and roll back as the v1 node does" {
    const t = target() orelse return error.SkipZigTest;
    const h = try Harness.create(t, .{});
    defer h.destroy();
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
    // independently: a statement that fails in a transaction of its own does not end the call.
    const after = try h.call("db",
        \\"mode":"independently","statements":[{"text":"insert into wfrt_pg_t values ($1, $2) returning id","values":[2,"dup"]},{"text":"insert into wfrt_pg_t values ($1, $2) returning id","values":[9,"y"]}]
    );
    try std.testing.expect(after.ok and std.mem.startsWith(u8, after.text, "{\"results\":[{\"error\":{\"length\":"));
    try std.testing.expect(std.mem.endsWith(u8, after.text, "}},{\"rows\":[{\"id\":9}],\"command\":\"INSERT\",\"rowCount\":1}]}"));
    // A deferred constraint fails at the commit. For a statement that runs alone, the statement failed.
    try h.expectPart("db",
        \\"mode":"independently","statements":[{"text":"drop table if exists wfrt_pg_d"},{"text":"create table wfrt_pg_d (id int unique deferrable initially deferred)"},{"text":"insert into wfrt_pg_d values (1)"}]
    , "{\"rows\":[],\"command\":\"INSERT\",\"rowCount\":1}]}");
    const deferred = try h.call("db",
        \\"mode":"independently","statements":[{"text":"insert into wfrt_pg_d values ($1)","values":[1]},{"text":"insert into wfrt_pg_d values ($1) returning id","values":[1]},{"text":"select count(*)::int4 as n from wfrt_pg_d"}]
    );
    try std.testing.expect(deferred.ok and std.mem.startsWith(u8, deferred.text, "{\"results\":[{\"error\":{\"length\":"));
    try std.testing.expectEqual(@as(usize, 2), std.mem.count(u8, deferred.text, "\"code\":\"23505\""));
    try std.testing.expectEqual(@as(usize, 2), std.mem.count(u8, deferred.text, "{\"error\":{"));
    try std.testing.expect(std.mem.endsWith(u8, deferred.text, "}},{\"rows\":[{\"n\":1}],\"command\":\"SELECT\",\"rowCount\":1}]}"));
    try h.expectPart("db", "\"statements\":[{\"text\":\"insert into wfrt_pg_d values ($1) returning id\",\"values\":[1]}]", "{\"results\":[{\"error\":{\"length\":");
    // In the mode `transaction` the failure of COMMIT is one more entry.
    try h.expectPart("db", "\"mode\":\"transaction\",\"statements\":[{\"text\":\"insert into wfrt_pg_d values ($1)\",\"values\":[1]}]", "{\"results\":[{\"rows\":[],\"command\":\"INSERT\",\"rowCount\":1},{\"error\":{\"length\":");
    try h.expectPart("db", "\"statements\":[{\"text\":\"drop table wfrt_pg_d\"}]", "\"command\":\"DROP\"");
}

test "pg live: a call without an exact native form ends with a marker and commits nothing" {
    const t = target() orelse return error.SkipZigTest;
    const h = try Harness.create(t, .{ .max_result = 2048 });
    defer h.destroy();
    try h.expectPart("db", reset, "\"command\":\"TRUNCATE\"");
    try h.expectError("db", "\"statements\":[{\"text\":\"insert into wfrt_pg_t values (1, 'a'); select 1\"}]", "(limit: sql-statement)");
    try h.expectError("db", "\"statements\":[{\"text\":\"insert into wfrt_pg_t values (1, 'a') returning array[v::bytea]\"}]", "(limit: sql-type)");
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
    const h = try Harness.create(t, .{});
    defer h.destroy();
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
    const h = try Harness.create(t, .{ .max_reqs = 3, .pool_conns = 1 });
    defer h.destroy();
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

// ---- tests against the scripted server (no database) ----------------------------

const kind_fake: u8 = 15;

const int4 = 23;
const text_oid = 25;
const hundred: [100]u8 = @splat('x');
const nine_k: [9000]u8 = @splat('x');

/// The script of the fake tests: one rule for each statement text.
const script = [_]fake.Rule{
    .{ .text = "select 42 as x", .cols = &.{.{ .name = "x", .oid = int4 }}, .rows = &.{&.{"42"}}, .tag = "SELECT 1" },
    .{
        .text = "select $1::int4 as a, $2 as t, $3 as z",
        .cols = &.{ .{ .name = "a", .oid = int4 }, .{ .name = "t", .oid = text_oid }, .{ .name = "z", .oid = text_oid } },
        .rows = &.{&.{ "7", "x'y; drop table x --", null }},
        .tag = "SELECT 1",
    },
    .{ .text = "insert into t values ($1)", .tag = "INSERT 0 1" },
    .{ .text = "insert into t values ($1) -- twice", .run_fail = .{ .code = "23505", .message = "duplicate key value" } },
    .{ .text = "insert into t values (1); select 1", .parse_fail = .{ .code = "42601", .message = "cannot insert multiple commands into a prepared statement" } },
    .{ .text = "insert into t values (1) returning b", .cols = &.{.{ .name = "b", .oid = 1001 }}, .rows = &.{&.{"{}"}}, .tag = "INSERT 0 1" },
    .{ .text = "insert into t values (1) returning big", .cols = &.{.{ .name = "big", .oid = text_oid }}, .rows = &.{&.{&hundred}}, .repeat = 50, .tag = "INSERT 0 50" },
    .{ .text = "select big", .cols = &.{.{ .name = "big", .oid = text_oid }}, .rows = &.{&.{&hundred}}, .repeat = 50, .tag = "SELECT 50" },
    .{ .text = "select one_big_row", .cols = &.{.{ .name = "big", .oid = text_oid }}, .rows = &.{&.{&nine_k}}, .tag = "SELECT 1" },
    .{ .text = "select pg_sleep(30)", .cols = &.{.{ .name = "s", .oid = text_oid }}, .act = .hang },
    .{ .text = "select then_close", .cols = &.{.{ .name = "s", .oid = text_oid }}, .act = .close },
};

/// The client and the scripted server on one poller, with a clock that
/// only the test moves.
const FakeHarness = struct {
    arena: std.heap.ArenaAllocator,
    poller: sys.Poller,
    client: *pg.Client,
    server: *fake.Server,
    store: creds.Store,
    next_seq: u32 = 1,
    now: i64 = 1_000_000,

    /// The harness lives in its own arena: `destroy` frees all of it.
    fn create(cfg: pg.Config, auth: fake.Auth) !*FakeHarness {
        var arena = std.heap.ArenaAllocator.init(std.testing.allocator);
        errdefer arena.deinit();
        const a = arena.allocator();
        const h = try a.create(FakeHarness);
        h.* = .{ .arena = arena, .poller = try sys.Poller.init(), .client = try a.create(pg.Client), .server = try a.create(fake.Server), .store = try creds.Store.parse(a, "{}") };
        try h.server.init(a, &h.poller, kind_fake);
        h.server.rules = &script;
        h.server.auth = auth;
        h.server.password = "secret";
        const doc = try std.fmt.allocPrint(a,
            \\{{"db":{{"data":{{"host":"127.0.0.1","port":{0d},"user":"alice","password":"secret","database":"app","maxConnections":100}}}},
            \\"db2":{{"data":{{"host":"127.0.0.1","port":{0d},"user":"bob","password":"secret","database":"app"}}}},
            \\"wrong":{{"data":{{"host":"127.0.0.1","port":{0d},"user":"alice","password":"not-the-password","database":"app"}}}},
            \\"tls":{{"data":{{"host":"127.0.0.1","port":{0d},"user":"alice","password":"secret","database":"app","ssl":"require","allowUnauthorizedCerts":true}}}}}}
        , .{h.server.port});
        h.store = try creds.Store.parse(a, doc);
        try h.client.init(a, cfg, &h.poller, kind_conn, kind_dns);
        // The arena as it is after the last allocation above.
        h.arena = arena;
        return h;
    }

    fn destroy(h: *FakeHarness) void {
        h.client.deinit();
        h.server.deinit();
        h.poller.deinit();
        var arena = h.arena;
        arena.deinit();
    }

    fn begin(h: *FakeHarness, args: []const u8) !u32 {
        const seq = h.next_seq;
        h.next_seq += 1;
        if (h.client.start(7, seq, args, &h.store, h.now)) |msg| {
            std.debug.print("start refused: {s}\n", .{msg});
            return error.Refused;
        }
        return seq;
    }

    /// One round of the event loop. It waits only while no socket is ready.
    fn step(h: *FakeHarness) void {
        var ready: [64]sys.Ready = @splat(.{ .token = 0, .readable = false, .writable = false, .eof = false });
        const n = h.poller.wait(&ready, 5);
        for (ready[0..n]) |ev| {
            const idx: u32 = @truncate(ev.token);
            const gen: u32 = @truncate((ev.token >> 32) & 0xFFFFFF);
            switch (ev.token >> 56) {
                kind_fake => h.server.onReady(ev),
                kind_conn => h.client.onConn(idx, gen, ev, h.now),
                // The name lookups of the client: the tests use addresses.
                else => h.client.onDns(@intCast(idx), ev),
            }
        }
        h.client.afterEvents(h.now);
    }

    /// Run the event loop until one call ends; give its seq and its answer.
    fn wait(h: *FakeHarness, seq_out: *u32) !Answer {
        for (0..4000) |_| {
            if (h.client.nextDone()) |d| {
                const text = try h.arena.allocator().dupe(u8, d.payload);
                seq_out.* = d.seq;
                h.client.release(d.req);
                return .{ .ok = d.ok, .text = text };
            }
            h.step();
        }
        return error.NoAnswer;
    }

    fn call(h: *FakeHarness, comptime slot: []const u8, comptime rest: []const u8) !Answer {
        var seq: u32 = 0;
        _ = try h.begin("{\"credential\":\"" ++ slot ++ "\",\"dialect\":\"postgres\"," ++ rest ++ "}");
        const a = try h.wait(&seq);
        try std.testing.expect(!h.server.failed);
        return a;
    }

    fn expectResult(h: *FakeHarness, comptime rest: []const u8, want: []const u8) !void {
        const a = try h.call("db", rest);
        if (!a.ok) std.debug.print("effect error: {s}\n", .{a.text});
        try std.testing.expect(a.ok);
        try std.testing.expectEqualStrings(want, a.text);
    }

    fn expectError(h: *FakeHarness, comptime rest: []const u8, want_part: []const u8) !void {
        const a = try h.call("db", rest);
        if (a.ok or std.mem.indexOf(u8, a.text, want_part) == null) std.debug.print("got ok={}: {s}\n", .{ a.ok, a.text });
        try std.testing.expect(!a.ok);
        try std.testing.expect(std.mem.indexOf(u8, a.text, want_part) != null);
    }

    /// The lines of the server log since the last call of this function.
    fn takeLog(h: *FakeHarness) ![]const u8 {
        const text = try h.arena.allocator().dupe(u8, h.server.logText());
        h.server.clearLog();
        return text;
    }
};

const one_row = "{\"results\":[{\"rows\":[{\"x\":42}],\"command\":\"SELECT\",\"rowCount\":1}]}";
const select_x = "\"statements\":[{\"text\":\"select 42 as x\"}]";

test "pg fake: the clear, MD5 and SCRAM logins, a wrong password and a server without TLS" {
    const methods = [_]fake.Auth{ .trust, .clear, .md5, .scram };
    for (methods) |method| {
        const h = try FakeHarness.create(.{}, method);
        defer h.destroy();
        try h.expectResult(select_x, one_row);
        try std.testing.expectEqual(@as(u32, 1), h.server.count("login alice"));
        if (method == .trust) continue;
        // The server refuses the password: the result has the error of the server.
        const a = try h.call("wrong", select_x);
        try std.testing.expect(a.ok);
        try std.testing.expect(std.mem.startsWith(u8, a.text, "{\"results\":[],\"connect\":{\"length\":"));
        try std.testing.expect(std.mem.indexOf(u8, a.text, "\"severity\":\"FATAL\",\"code\":\"28P01\"") != null);
        try std.testing.expectEqual(@as(u32, 1), h.server.count("refused alice"));
        try std.testing.expectEqual(@as(u32, 1), h.server.logins);
    }
    const h = try FakeHarness.create(.{}, .trust);
    defer h.destroy();
    const a = try h.call("tls", select_x);
    try std.testing.expectEqualStrings("{\"results\":[],\"connect\":{\"message\":\"The server does not support SSL connections\"}}", a.text);
}

test "pg fake: a statement is prepared once, and values go as binds" {
    const h = try FakeHarness.create(.{}, .trust);
    defer h.destroy();
    for (0..3) |_| try h.expectResult(select_x, one_row);
    try std.testing.expectEqual(@as(u32, 1), h.server.count("parse select 42 as x"));
    try std.testing.expectEqual(@as(u32, 3), h.server.count("run select 42 as x"));
    try std.testing.expectEqual(@as(u64, 1), h.client.counters.prepared);
    try std.testing.expectEqual(@as(u64, 1), h.client.counters.connects);
    try std.testing.expectEqual(@as(u64, 2), h.client.counters.reused);
    _ = try h.takeLog();
    try h.expectResult(
        \\"statements":[{"text":"select $1::int4 as a, $2 as t, $3 as z","values":[7,"x'y; drop table x --",null]}]
    ,
        \\{"results":[{"rows":[{"a":7,"t":"x'y; drop table x --","z":null}],"command":"SELECT","rowCount":1}]}
    );
    // The text has the placeholders; the values are in the Bind message only.
    try std.testing.expectEqualStrings(
        \\parse select $1::int4 as a, $2 as t, $3 as z
        \\bind 7|x'y; drop table x --|NULL
        \\run select $1::int4 as a, $2 as t, $3 as z
        \\
    , try h.takeLog());
}

test "pg fake: the three modes, and an error in a transaction rolls back" {
    const h = try FakeHarness.create(.{}, .trust);
    defer h.destroy();
    const three =
        \\"statements":[{"text":"insert into t values ($1)","values":[1]},{"text":"insert into t values ($1) -- twice","values":[1]},{"text":"insert into t values ($1)","values":[2]}]
    ;
    const failure = "{\"error\":{\"length\":47,\"severity\":\"ERROR\",\"code\":\"23505\",\"message\":\"duplicate key value\"}}";
    const insert = "{\"rows\":[],\"command\":\"INSERT\",\"rowCount\":1}";
    // transaction: the results end with the failure, and nothing is committed.
    try h.expectResult("\"mode\":\"transaction\"," ++ three, "{\"results\":[" ++ insert ++ "," ++ failure ++ "]}");
    try std.testing.expectEqualStrings(
        \\login alice
        \\parse insert into t values ($1)
        \\parse insert into t values ($1) -- twice
        \\BEGIN
        \\bind 1
        \\run insert into t values ($1)
        \\bind 1
        \\run insert into t values ($1) -- twice
        \\ROLLBACK
        \\
    , try h.takeLog());
    // single with more than one statement is the same transaction.
    try h.expectResult(three, "{\"results\":[" ++ insert ++ "," ++ failure ++ "]}");
    try std.testing.expectEqualStrings("BEGIN\nbind 1\nrun insert into t values ($1)\nbind 1\nrun insert into t values ($1) -- twice\nROLLBACK\n", try h.takeLog());
    // independently: each statement runs alone, and the one after the failure runs.
    try h.expectResult("\"mode\":\"independently\"," ++ three, "{\"results\":[" ++ insert ++ "," ++ failure ++ "," ++ insert ++ "]}");
    try std.testing.expectEqualStrings("bind 1\nrun insert into t values ($1)\nbind 1\nrun insert into t values ($1) -- twice\nbind 2\nrun insert into t values ($1)\n", try h.takeLog());
    // transaction with one statement, and all statements good: COMMIT.
    try h.expectResult("\"mode\":\"transaction\",\"statements\":[{\"text\":\"insert into t values ($1)\",\"values\":[5]}]", "{\"results\":[" ++ insert ++ "]}");
    try std.testing.expectEqualStrings("BEGIN\nbind 5\nrun insert into t values ($1)\nCOMMIT\n", try h.takeLog());
    // single with one statement that gives no rows runs alone.
    try h.expectResult("\"statements\":[{\"text\":\"insert into t values ($1)\",\"values\":[6]}]", "{\"results\":[" ++ insert ++ "]}");
    try std.testing.expectEqualStrings("bind 6\nrun insert into t values ($1)\n", try h.takeLog());
}

test "pg fake: a call without an exact native form ends with a marker and commits nothing" {
    const h = try FakeHarness.create(.{ .max_result = 2048 }, .trust);
    defer h.destroy();
    // The server refuses to prepare two commands: nothing ran.
    try h.expectError("\"statements\":[{\"text\":\"insert into t values ($1)\",\"values\":[1]},{\"text\":\"insert into t values (1); select 1\"}]", "(limit: sql-statement)");
    try std.testing.expectEqual(@as(u32, 0), h.server.count("BEGIN"));
    try std.testing.expect(std.mem.indexOf(u8, h.server.logText(), "run ") == null);
    // A column type without a native form shows when the statement is described.
    try h.expectError("\"statements\":[{\"text\":\"insert into t values (1) returning b\"}]", "(limit: sql-type)");
    try std.testing.expect(std.mem.indexOf(u8, h.server.logText(), "run ") == null);
    _ = try h.takeLog();
    // A result over the limit shows in the rows: the statement is rolled back.
    try h.expectError("\"statements\":[{\"text\":\"insert into t values (1) returning big\"}]", "(limit: sql-max-result)");
    try std.testing.expectEqualStrings("parse insert into t values (1) returning big\nBEGIN\nbind\nrun insert into t values (1) returning big\nROLLBACK\n", try h.takeLog());
    // A SELECT runs again in the host: no transaction.
    try h.expectError("\"statements\":[{\"text\":\"select big\"}]", "(limit: sql-max-result)");
    try std.testing.expectEqualStrings("parse select big\nbind\nrun select big\n", try h.takeLog());
    // One row larger than the read buffer of the connection.
    try h.expectError("\"statements\":[{\"text\":\"select one_big_row\"}]", "(limit: sql-max-result)");
    // The connection is good for the next call.
    try h.expectResult(select_x, one_row);
    try std.testing.expectEqual(@as(u64, 1), h.client.counters.connects);
    try std.testing.expectEqual(@as(u64, 5), h.client.counters.to_host);
    // After a committed statement the call cannot run again: no marker.
    const a = try h.call("db", "\"mode\":\"independently\",\"statements\":[{\"text\":\"insert into t values ($1)\",\"values\":[1]},{\"text\":\"select big\"}]");
    try std.testing.expect(!a.ok);
    try std.testing.expect(std.mem.indexOf(u8, a.text, "(limit: sql-") == null);
    try std.testing.expect(std.mem.endsWith(u8, a.text, "(limit)"));
}

test "pg fake: a pool has a fixed size, calls wait in order, and a call without a slot is refused" {
    const h = try FakeHarness.create(.{ .max_reqs = 3, .pool_conns = 1, .max_conns = 1 }, .trust);
    defer h.destroy();
    const args = "{\"credential\":\"db\",\"dialect\":\"postgres\"," ++ select_x ++ "}";
    var seqs: [3]u32 = @splat(0);
    for (&seqs) |*s| s.* = try h.begin(args);
    // The fourth call has no slot: it is refused at once.
    try std.testing.expect(h.client.start(7, 99, args, &h.store, h.now) != null);
    for (seqs) |want| {
        var seq: u32 = 0;
        const a = try h.wait(&seq);
        try std.testing.expectEqualStrings(one_row, a.text);
        // One connection: the calls end in the order in which they came.
        try std.testing.expectEqual(want, seq);
    }
    try std.testing.expectEqual(@as(u64, 1), h.client.counters.connects);
    try std.testing.expectEqual(@as(u64, 2), h.client.counters.waited);
    try std.testing.expectEqual(@as(u64, 1), h.client.counters.refused);
    // The shard has one connection: a call of another credential closes the idle one.
    const other = try h.call("db2", select_x);
    try std.testing.expectEqualStrings(one_row, other.text);
    try std.testing.expectEqual(@as(u32, 1), h.server.count("login bob"));
    try std.testing.expectEqual(@as(u64, 2), h.client.counters.connects);
    // An idle connection closes after `idle_ms`, with a Terminate message.
    h.now += 31_000;
    for (0..200) |_| {
        if (h.server.sessions() == 0) break;
        h.step();
    }
    try std.testing.expectEqual(@as(u32, 0), h.server.sessions());
    try std.testing.expect(!h.server.failed);
}

test "pg fake: the time limit of a call cancels the statement" {
    const h = try FakeHarness.create(.{}, .trust);
    defer h.destroy();
    var seq: u32 = 0;
    _ = try h.begin("{\"credential\":\"db\",\"dialect\":\"postgres\",\"timeoutMs\":500,\"statements\":[{\"text\":\"select pg_sleep(30)\"}]}");
    // The statement runs on the server, which gives no answer.
    for (0..200) |_| {
        if (h.server.count("run select pg_sleep(30)") == 1) break;
        h.step();
    }
    try std.testing.expectEqual(@as(u32, 1), h.server.count("run select pg_sleep(30)"));
    try std.testing.expectEqual(@as(?pg.Done, null), h.client.nextDone());
    h.now += 600;
    const a = try h.wait(&seq);
    try std.testing.expect(!a.ok);
    try std.testing.expectEqualStrings("sql: no result before the time limit of the call; the statement was cancelled", a.text);
    // The cancel request goes on a connection of its own, with the key of the session.
    for (0..200) |_| {
        if (h.server.cancels == 1 and h.server.sessions() == 0) break;
        h.step();
    }
    try std.testing.expectEqual(@as(u32, 1), h.server.cancels);
    try std.testing.expectEqual(@as(u32, 1000), h.server.cancel_pid);
    try std.testing.expectEqual(fake.Server.secret_key, h.server.cancel_key);
    try std.testing.expectEqual(@as(u32, 0), h.server.sessions());
    try std.testing.expectEqual(@as(u64, 1), h.client.counters.timeouts);
    // The next call opens a new connection.
    try h.expectResult(select_x, one_row);
    try std.testing.expectEqual(@as(u64, 2), h.client.counters.connects);
}

test "pg fake: a connection that closes while a statement runs fails the step" {
    const h = try FakeHarness.create(.{}, .trust);
    defer h.destroy();
    try h.expectResult(select_x, one_row);
    const a = try h.call("db", "\"statements\":[{\"text\":\"select then_close\"}]");
    try std.testing.expect(!a.ok);
    try std.testing.expectEqualStrings("sql: the connection to the database closed", a.text);
    // The pool has no connection now: the next call logs in again.
    try h.expectResult(select_x, one_row);
    try std.testing.expectEqual(@as(u64, 2), h.client.counters.connects);
    try std.testing.expectEqual(@as(u32, 2), h.server.logins);
}

const typed_cols = [_]fake.Col{ .{ .name = "a", .oid = 1007 }, .{ .name = "t", .oid = 1009 }, .{ .name = "i", .oid = 1186 }, .{ .name = "p", .oid = 600 }, .{ .name = "c", .oid = 718 }, .{ .name = "n", .oid = 1231 } };
const typed_rules = [_]fake.Rule{
    .{ .text = "select typed", .cols = &typed_cols, .rows = &.{ &.{ "{1,NULL,{2}}", "{a,\"b c\",NULL}", "1 day 02:00:00", "(1.5,-2)", "<(1,2),3>", "{1.50,NaN}" }, &.{ null, null, null, null, null, null } }, .tag = "SELECT 2" },
    .{ .text = "insert into t values (1) returning i", .cols = &.{.{ .name = "i", .oid = 1186 }}, .rows = &.{&.{"P1D"}}, .tag = "INSERT 0 1" },
    .{ .text = "select stamps", .cols = &.{.{ .name = "s", .oid = 1185 }}, .rows = &.{&.{"{\"2024-01-02 03:04:05+00\"}"}}, .tag = "SELECT 1" },
};

test "pg fake: arrays, interval, point and circle columns, and the styles of the session" {
    const h = try FakeHarness.create(.{ .max_result = 2048 }, .trust);
    defer h.destroy();
    h.server.rules = &typed_rules;
    try h.expectResult("\"largeNumbers\":\"numbers\",\"statements\":[{\"text\":\"select typed\"}]",
        \\{"results":[{"rows":[{"a":[1,null,[2]],"t":["a","b c",null],"i":{"days":1,"hours":2},"p":{"x":1.5,"y":-2},"c":{"x":1,"y":2,"radius":3},"n":[1.5,null]},{"a":null,"t":null,"i":null,"p":null,"c":null,"n":null}],"command":"SELECT","rowCount":2}]}
    );
    try h.expectResult("\"statements\":[{\"text\":\"select stamps\"}]", "{\"results\":[{\"rows\":[{\"s\":[\"2024-01-02T03:04:05.000Z\"]}],\"command\":\"SELECT\",\"rowCount\":1}]}");
    // With `dates: legacy` the v1 node gives Date objects for the elements: no native form.
    try h.expectError("\"dates\":\"legacy\",\"statements\":[{\"text\":\"select stamps\"}]", "(limit: sql-type)");
    _ = try h.takeLog();
    // An interval text in another style shows only in the row: the insert is rolled back.
    try h.expectError("\"statements\":[{\"text\":\"insert into t values (1) returning i\"}]", "(limit: sql-type)");
    try std.testing.expectEqualStrings("parse insert into t values (1) returning i\nBEGIN\nbind\nrun insert into t values (1) returning i\nROLLBACK\n", try h.takeLog());

    // A session whose IntervalStyle or DateStyle is not the one that the client reads:
    // the marker comes when the statement is described, before it runs.
    const other = try FakeHarness.create(.{}, .trust);
    defer other.destroy();
    other.server.rules = &typed_rules;
    other.server.intervalstyle = "iso_8601";
    other.server.datestyle = "German, DMY";
    try other.expectError("\"statements\":[{\"text\":\"insert into t values (1) returning i\"}]", "(limit: sql-type)");
    try other.expectError("\"statements\":[{\"text\":\"select stamps\"}]", "(limit: sql-type)");
    try std.testing.expect(std.mem.indexOf(u8, other.server.logText(), "run ") == null);
}

const id_col = [_]fake.Col{.{ .name = "id", .oid = int4 }};
const big_col = [_]fake.Col{.{ .name = "big", .oid = text_oid }};
const alone_rules = [_]fake.Rule{
    .{ .text = "select 42 as x", .cols = &.{.{ .name = "x", .oid = int4 }}, .rows = &.{&.{"42"}}, .tag = "SELECT 1" },
    .{ .text = "select big", .cols = &big_col, .rows = &.{&.{&hundred}}, .repeat = 50, .tag = "SELECT 50" },
    .{ .text = "insert into t values ($1)", .tag = "INSERT 0 1" },
    .{ .text = "insert into t values ($1) -- twice", .run_fail = .{ .code = "23505", .message = "duplicate key value" } },
    .{ .text = "insert into t values ($1) returning id", .cols = &id_col, .rows = &.{&.{"1"}}, .tag = "INSERT 0 1" },
    .{ .text = "insert into t values ($1) returning id -- twice", .cols = &id_col, .run_fail = .{ .code = "23505", .message = "duplicate key value" } },
    .{ .text = "insert into t values ($1) returning big", .cols = &big_col, .rows = &.{&.{&hundred}}, .repeat = 50, .tag = "INSERT 0 50" },
    .{ .text = "select x into t2 from t", .tag = "SELECT 3" },
};

test "pg fake: independently, a statement that fails in its own transaction does not end the call" {
    const h = try FakeHarness.create(.{}, .trust);
    defer h.destroy();
    h.server.rules = &alone_rules;
    const failure = "{\"error\":{\"length\":47,\"severity\":\"ERROR\",\"code\":\"23505\",\"message\":\"duplicate key value\"}}";
    try h.expectResult(
        \\"mode":"independently","statements":[{"text":"insert into t values ($1) returning id -- twice","values":[1]},{"text":"insert into t values ($1) returning id","values":[2]},{"text":"insert into t values ($1)","values":[3]}]
    , "{\"results\":[" ++ failure ++ ",{\"rows\":[{\"id\":1}],\"command\":\"INSERT\",\"rowCount\":1},{\"rows\":[],\"command\":\"INSERT\",\"rowCount\":1}]}");
    try std.testing.expectEqual(@as(u32, 2), h.server.count("BEGIN"));
    try std.testing.expectEqual(@as(u32, 1), h.server.count("ROLLBACK"));
    try std.testing.expectEqual(@as(u32, 1), h.server.count("COMMIT"));
    try std.testing.expectEqual(@as(u32, 1), h.server.count("run insert into t values ($1)"));
}

test "pg fake: independently, a marker is given while no statement with an effect is committed" {
    const h = try FakeHarness.create(.{ .max_result = 2048 }, .trust);
    defer h.destroy();
    h.server.rules = &alone_rules;
    const head = "\"mode\":\"independently\",\"statements\":[";
    const select = "{\"text\":\"select 42 as x\"}";
    const big = "{\"text\":\"select big\"}";
    const insert = "{\"text\":\"insert into t values ($1)\",\"values\":[1]}";
    const dup = "{\"text\":\"insert into t values ($1) -- twice\",\"values\":[1]}";
    // Statements that only read commit nothing: the host can run the call again.
    try h.expectError(head ++ select ++ "," ++ select ++ "," ++ big ++ "]", "(limit: sql-max-result)");
    // A statement that failed has no effect.
    try h.expectError(head ++ dup ++ "," ++ big ++ "]", "(limit: sql-max-result)");
    // A statement in its own transaction is rolled back at the limit.
    _ = try h.takeLog();
    try h.expectError(head ++ select ++ ",{\"text\":\"insert into t values ($1) returning big\",\"values\":[1]}," ++ insert ++ "]", "(limit: sql-max-result)");
    try std.testing.expectEqual(@as(u32, 1), h.server.count("ROLLBACK"));
    try std.testing.expectEqual(@as(u32, 0), h.server.count("COMMIT"));
    try std.testing.expectEqual(@as(u32, 0), h.server.count("run insert into t values ($1)"));
    try std.testing.expectEqual(@as(u64, 3), h.client.counters.to_host);
    // After a statement with an effect, the call cannot run again: a limit error without a marker,
    // and the statements after the one at the limit do not run.
    const cases = [_][]const u8{
        "{\"credential\":\"db\",\"dialect\":\"postgres\"," ++ head ++ insert ++ "," ++ big ++ "," ++ select ++ "]}",
        "{\"credential\":\"db\",\"dialect\":\"postgres\"," ++ head ++ "{\"text\":\"select x into t2 from t\"}," ++ big ++ "," ++ select ++ "]}",
        "{\"credential\":\"db\",\"dialect\":\"postgres\"," ++ head ++ "{\"text\":\"insert into t values ($1) returning id\",\"values\":[1]}," ++ select ++ "," ++ big ++ "]}",
    };
    for (cases) |args| {
        var seq: u32 = 0;
        _ = try h.begin(args);
        const a = try h.wait(&seq);
        try std.testing.expect(!a.ok);
        try std.testing.expectEqualStrings("sql: the result is larger than 2 KB (--sql-max-result-kb) (limit)", a.text);
    }
    try std.testing.expectEqual(@as(u64, 3), h.client.counters.to_host);
    try std.testing.expect(!h.server.failed);
}

const deferred_fail: fake.Fail = .{ .code = "23505", .message = "duplicate key value" };
const deferred_rules = [_]fake.Rule{
    .{ .text = "select 42 as x", .cols = &.{.{ .name = "x", .oid = int4 }}, .rows = &.{&.{"42"}}, .tag = "SELECT 1" },
    .{ .text = "insert into d values ($1)", .tag = "INSERT 0 1", .commit_fail = deferred_fail },
    .{ .text = "insert into d values ($1) returning id", .cols = &id_col, .rows = &.{&.{"1"}}, .tag = "INSERT 0 1", .commit_fail = deferred_fail },
};

test "pg fake: a commit that fails is the failure of a statement that runs alone, and one more entry in a transaction" {
    const h = try FakeHarness.create(.{}, .trust);
    defer h.destroy();
    h.server.rules = &deferred_rules;
    const failure = "{\"error\":{\"length\":47,\"severity\":\"ERROR\",\"code\":\"23505\",\"message\":\"duplicate key value\"}}";
    const insert = "{\"rows\":[],\"command\":\"INSERT\",\"rowCount\":1}";
    const plain = "{\"text\":\"insert into d values ($1)\",\"values\":[1]}";
    const returning = "{\"text\":\"insert into d values ($1) returning id\",\"values\":[1]}";
    // independently: one entry for each statement, in statement order.
    try h.expectResult("\"mode\":\"independently\",\"statements\":[" ++ plain ++ "," ++ returning ++ ",{\"text\":\"select 42 as x\"}]", "{\"results\":[" ++ failure ++ "," ++ failure ++ ",{\"rows\":[{\"x\":42}],\"command\":\"SELECT\",\"rowCount\":1}]}");
    // single with one statement: the statement runs alone, with or without the transaction of the client.
    try h.expectResult("\"statements\":[" ++ plain ++ "]", "{\"results\":[" ++ failure ++ "]}");
    try h.expectResult("\"statements\":[" ++ returning ++ "]", "{\"results\":[" ++ failure ++ "]}");
    // A transaction of the mode: the entries of the statements, then the failure of COMMIT.
    try h.expectResult("\"mode\":\"transaction\",\"statements\":[" ++ plain ++ "]", "{\"results\":[" ++ insert ++ "," ++ failure ++ "]}");
    try h.expectResult("\"statements\":[" ++ plain ++ "," ++ plain ++ "]", "{\"results\":[" ++ insert ++ "," ++ insert ++ "," ++ failure ++ "]}");
    try std.testing.expect(!h.server.failed);
}
